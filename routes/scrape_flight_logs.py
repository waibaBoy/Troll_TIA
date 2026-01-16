import argparse
import csv
import os
import re
import time
from pathlib import Path

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

URL = "https://www.tiairport.com.np/all-flights"
TAB_LABELS = [
    "International-Arrivals",
    "International-Departure",
    "Domestic-Arrivals",
    "Domestic-Departure",
]
TAB_FILENAMES = {
    "International-Arrivals": "Int_arrival.csv",
    "International-Departure": "Int_departure.csv",
    "Domestic-Arrivals": "Domestic_arrival.csv",
    "Domestic-Departure": "Domestic_departure.csv",
}


def handle_verification(driver, timeout: int = 30):
    print("Checking for verification challenges...")
    
    end_time = time.time() + timeout
    debug_printed = False
    
    while time.time() < end_time:
        try:
            title = driver.title.lower()
            page_source = driver.page_source.lower()
            
            if "just a moment" in title or "verify you are human" in page_source:
                print("Verification page detected, waiting for checkbox...")
                
                time.sleep(2)
                
                if not debug_printed:
                    print("\n=== DEBUG INFO ===")
                    print(f"Page title: {driver.title}")
                    print(f"Current URL: {driver.current_url}")
                    iframes = driver.find_elements(By.TAG_NAME, "iframe")
                    print(f"Found {len(iframes)} iframes:")
                    for idx, iframe in enumerate(iframes):
                        src = iframe.get_attribute("src") or "no src"
                        id_attr = iframe.get_attribute("id") or "no id"
                        title_attr = iframe.get_attribute("title") or "no title"
                        print(f"  iframe {idx}: src={src[:80]}, id={id_attr}, title={title_attr}")
                    
                    inputs = driver.find_elements(By.TAG_NAME, "input")
                    print(f"\nFound {len(inputs)} input elements:")
                    for idx, inp in enumerate(inputs):
                        type_attr = inp.get_attribute("type") or "no type"
                        id_attr = inp.get_attribute("id") or "no id"
                        name_attr = inp.get_attribute("name") or "no name"
                        class_attr = inp.get_attribute("class") or "no class"
                        visible = inp.is_displayed()
                        print(f"  input {idx}: type={type_attr}, id={id_attr}, name={name_attr}, class={class_attr}, visible={visible}")

                    buttons = driver.find_elements(By.TAG_NAME, "button")
                    print(f"\nFound {len(buttons)} buttons:")
                    for idx, btn in enumerate(buttons):
                        text = btn.text or "no text"
                        id_attr = btn.get_attribute("id") or "no id"
                        class_attr = btn.get_attribute("class") or "no class"
                        visible = btn.is_displayed()
                        print(f"  button {idx}: text={text}, id={id_attr}, class={class_attr}, visible={visible}")
                    
                    print("==================\n")
                    debug_printed = True
                try:
                    iframe_selectors = [
                        "iframe[src*='challenges.cloudflare.com']",
                        "iframe[title*='challenge']",
                        "iframe[id*='challenge']",
                        "iframe",
                    ]
                    
                    for selector in iframe_selectors:
                        iframes = driver.find_elements(By.CSS_SELECTOR, selector)
                        for iframe in iframes:
                            try:
                                print(f"Trying iframe: {iframe.get_attribute('src') or iframe.get_attribute('id')}")
                                driver.switch_to.frame(iframe)
                                
                                checkbox_selectors = [
                                    "input[type='checkbox']",
                                    ".cb-lb",
                                    "#challenge-stage input",
                                    "input",
                                    "span.cb-lb",
                                ]
                                
                                for cb_selector in checkbox_selectors:
                                    try:
                                        checkbox = WebDriverWait(driver, 3).until(
                                            EC.presence_of_element_located((By.CSS_SELECTOR, cb_selector))
                                        )
                                        if checkbox.is_displayed():
                                            print(f"Found checkbox with selector: {cb_selector}")
                                            try:
                                                checkbox.click()
                                            except:
                                                driver.execute_script("arguments[0].click();", checkbox)
                                            print("Clicked verification checkbox!")
                                            driver.switch_to.default_content()
                                            time.sleep(3)
                                            return True
                                    except:
                                        continue
                                
                                driver.switch_to.default_content()
                            except:
                                driver.switch_to.default_content()
                                continue
                except Exception as e:
                    print(f"Error checking iframes: {e}")
                    driver.switch_to.default_content()
                try:
                    checkbox_selectors = [
                        "input[type='checkbox']",
                        ".challenge-form input",
                        "#challenge-form input",
                        "input[name*='challenge']",
                    ]
                    
                    for selector in checkbox_selectors:
                        try:
                            checkboxes = driver.find_elements(By.CSS_SELECTOR, selector)
                            for checkbox in checkboxes:
                                if checkbox.is_displayed():
                                    print(f"Found direct checkbox: {selector}")
                                    try:
                                        checkbox.click()
                                    except:
                                        driver.execute_script("arguments[0].click();", checkbox)
                                    print("Clicked verification checkbox!")
                                    time.sleep(3)
                                    return True
                        except:
                            continue
                except Exception as e:
                    print(f"Error checking direct checkboxes: {e}")
            try:
                if driver.find_elements(By.XPATH, f"//a[contains(normalize-space(.), '{TAB_LABELS[0]}')]"):
                    print("Verification passed - page loaded successfully!")
                    return True
            except:
                pass
            
            print("Still waiting for verification... (check browser window)")
            time.sleep(2)
            
        except Exception as e:
            print(f"Exception during verification: {e}")
            time.sleep(1)
    
    print("Verification timeout reached")
    return False


def normalize_filename(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", label.strip().lower())
    return slug.strip("_") or "tab"


def clean_text(value: str) -> str:
    return " ".join(value.split())


def extract_table(table_html: str):
    soup = BeautifulSoup(table_html, "html.parser")
    table = soup.find("table")
    if table is None:
        return [], []

    headers = [clean_text(th.get_text(" ", strip=True)) for th in table.select("thead th")]
    rows = []

    body_rows = table.select("tbody tr")
    if not body_rows:
        body_rows = [row for row in table.select("tr") if row.find_parent("thead") is None]

    for row in body_rows:
        cells = row.find_all(["td", "th"])
        values = [clean_text(cell.get_text(" ", strip=True)) for cell in cells]
        if headers:
            if len(values) < len(headers):
                values.extend([""] * (len(headers) - len(values)))
            elif len(values) > len(headers):
                values = values[: len(headers)]
        rows.append(values)

    if not headers:
        max_len = max((len(row) for row in rows), default=0)
        headers = [f"col_{idx}" for idx in range(1, max_len + 1)]
        padded = []
        for row in rows:
            if len(row) < len(headers):
                row = row + [""] * (len(headers) - len(row))
            padded.append(row)
        rows = padded

    return headers, rows


def write_csv(headers, rows, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        if headers:
            writer.writerow(headers)
        writer.writerows(rows)


def create_driver(headless: bool):
    try:
        import undetected_chromedriver as uc
        print("Using undetected-chromedriver for better Cloudflare bypass...")
        options = uc.ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1400,900")
        
        driver = uc.Chrome(options=options, version_main=None)
        print("Successfully initialized undetected-chromedriver")
        return driver
    except ImportError:
        print("undetected-chromedriver not found, using standard selenium")
        print("Install it with: pip install undetected-chromedriver")
    except Exception as e:
        print(f"undetected-chromedriver failed: {e}, falling back to selenium")

    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,900")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

    try:
        driver = webdriver.Chrome(options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver
    except WebDriverException as exc:
        original_path = os.environ.get("PATH", "")
        path_entries = original_path.split(os.pathsep) if original_path else []
        kept_entries = []
        removed_entries = []
        for entry in path_entries:
            trimmed = entry.strip('"')
            if not trimmed:
                continue
            driver_exe = Path(trimmed) / "chromedriver.exe"
            driver_bin = Path(trimmed) / "chromedriver"
            if driver_exe.exists() or driver_bin.exists():
                removed_entries.append(entry)
            else:
                kept_entries.append(entry)

        if removed_entries:
            os.environ["PATH"] = os.pathsep.join(kept_entries)
            print("Found chromedriver in PATH; retrying with Selenium Manager...")
            try:
                driver = webdriver.Chrome(options=options)
                driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                return driver
            except WebDriverException:
                pass
            finally:
                os.environ["PATH"] = original_path

        try:
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager

            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            return driver
        except Exception as inner_exc:
            raise RuntimeError(
                "Unable to start Chrome. Install Chrome and selenium>=4.6, or "
                "install webdriver-manager for the fallback."
            ) from inner_exc


def find_tab(driver, label: str):
    try:
        xpath = f"//a[normalize-space(.)='{label}']"
        candidates = driver.find_elements(By.XPATH, xpath)
        for candidate in candidates:
            if candidate.is_displayed():
                return candidate
    except:
        pass
    try:
        if "International-Arrivals" in label:
            href_id = "#intArrivals"
        elif "International-Departure" in label:
            href_id = "#intDeparted"
        elif "Domestic-Arrivals" in label:
            href_id = "#domArrivals"
        elif "Domestic-Departure" in label:
            href_id = "#domDeparted"
        else:
            href_id = None
        
        if href_id:
            xpath = f"//a[@href='{href_id}']"
            candidates = driver.find_elements(By.XPATH, xpath)
            for candidate in candidates:
                if candidate.is_displayed():
                    return candidate
    except:
        pass
    
    try:
        xpath = f"//a[contains(normalize-space(.), '{label}')]"
        candidates = driver.find_elements(By.XPATH, xpath)
        for candidate in candidates:
            if candidate.is_displayed():
                return candidate
    except:
        pass
    
    return None


def resolve_panel_selector(tab):
    target = (
        tab.get_attribute("data-bs-target")
        or tab.get_attribute("data-target")
        or tab.get_attribute("href")
        or tab.get_attribute("aria-controls")
    )
    if not target:
        return None
    
    target = target.strip()
    if not target or target.startswith("javascript:"):
        return None

    if "#" in target:
        fragment = target.split("#", 1)[1].strip()
        return f"#{fragment}" if fragment else None

    if target.startswith("#"):
        return target

    return f"#{target}"


def find_panel(driver, selector: str | None):
    if selector:
        try:
            return driver.find_element(By.CSS_SELECTOR, selector)
        except NoSuchElementException:
            pass
    for css in (".tab-pane.show.active", ".tab-pane.active", ".tab-content .active"):
        try:
            return driver.find_element(By.CSS_SELECTOR, css)
        except NoSuchElementException:
            continue
    return None


def wait_for_table(driver, panel_selector: str | None, timeout: int):
    end_time = time.time() + timeout
    last_html = ""
    
    while time.time() < end_time:
        panel = find_panel(driver, panel_selector)
        if panel is None:
            time.sleep(0.5)
            continue
        
        try:
            driver.execute_script("arguments[0].scrollIntoView(true);", panel)
            time.sleep(0.3)
        except:
            pass
        
        try:
            table = panel.find_element(By.CSS_SELECTOR, "table")
        except NoSuchElementException:
            time.sleep(0.5)
            continue

        html = table.get_attribute("innerHTML") or ""
        
        if "loading" in html.lower() and html != last_html:
            last_html = html
            time.sleep(0.5)
            continue
        
        try:
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            if len(rows) > 0:
                return table
        except:
            pass
        
        time.sleep(0.5)

    return None


def wait_for_tabs(driver, labels, timeout: int):
    end_time = time.time() + timeout
    while time.time() < end_time:
        found = [label for label in labels if find_tab(driver, label)]
        if found:
            return found
        time.sleep(0.5)
    return []


def scrape_tabs(driver, labels, out_dir: Path, timeout: int):
    results = {}
    
    for label in labels:
        print(f"\n--- Processing tab: {label} ---")
        tab = find_tab(driver, label)
        
        if tab is None:
            print(f"Tab not found: {label}")
            continue

        print(f"Found tab, clicking...")
        try:
            driver.execute_script("arguments[0].scrollIntoView(true);", tab)
            time.sleep(0.3)
  
            driver.execute_script("arguments[0].click();", tab)
            time.sleep(1)
      
            parent_li = tab.find_element(By.XPATH, "..")
            if "uk-active" in parent_li.get_attribute("class"):
                print("Tab activated successfully")
            else:
                print("Tab may not be active yet, waiting...")
                time.sleep(1)
                
        except (StaleElementReferenceException, TimeoutException) as e:
            print(f"Error clicking tab: {e}")
            pass

        panel_selector = None
        try:
            panel_selector = resolve_panel_selector(tab)
            print(f"Looking for panel: {panel_selector}")
        except StaleElementReferenceException:
            panel_selector = None

        print("Waiting for table to load...")
        table = wait_for_table(driver, panel_selector, timeout)
        
        if table is None:
            print(f"Table not found for {label}, trying to get panel HTML anyway...")
            panel = find_panel(driver, panel_selector)
            html = panel.get_attribute("innerHTML") if panel else ""
        else:
            html = table.get_attribute("outerHTML")
            print(f"Table found!")

        headers, rows = extract_table(html)

        output_path = out_dir / TAB_FILENAMES.get(
            label, f"{normalize_filename(label)}.csv"
        )
        write_csv(headers, rows, output_path)
        results[label] = (output_path, len(rows))
        print(f"Saved {label}: {len(rows)} rows -> {output_path}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Scrape TIA flight logs.")
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run Chrome with a visible window (default is headless).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=45,
        help="Seconds to wait for tabs and tables.",
    )
    parser.add_argument(
        "--out-dir",
        default=".",
        help="Directory for CSV output (relative to this script).",
    )
    parser.add_argument(
        "--manual",
        action="store_true",
        help="Skip auto-verification and wait for manual completion.",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    out_dir = (script_dir / args.out_dir).resolve()

    driver = create_driver(headless=not args.headed)
    try:
        print(f"Loading {URL}...")
        driver.get(URL)
        
        if not args.manual:
            verification_success = handle_verification(driver, timeout=30)
            if not verification_success:
                print("\nAutomatic verification failed.")
                print("Please complete the verification manually in the browser window.")
                input("Press Enter once you've completed the verification...")
        else:
            print("Manual mode: complete verification in browser.")
            input("Press Enter once you've completed the verification...")
        
        print("Waiting for page content to load...")
        tabs_ready = wait_for_tabs(driver, TAB_LABELS, args.timeout)
        
        if not tabs_ready:
            print("Tabs still not visible. Waiting for manual intervention...")
            input("If needed, complete any remaining challenges and press Enter...")
            tabs_ready = wait_for_tabs(driver, TAB_LABELS, args.timeout)
        
        if not tabs_ready:
            raise RuntimeError("Tabs were not detected after verification. Page may have changed.")

        print(f"Found {len(tabs_ready)} tabs. Starting scrape...")
        scrape_tabs(driver, TAB_LABELS, out_dir, args.timeout)
        print("\nScraping completed successfully!")
        
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
