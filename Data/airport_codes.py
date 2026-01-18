"""
Airport code mapping utility.
Maps city names from TIA website to IATA codes.
Supports auto-discovery for unknown airports.
"""

# Comprehensive mapping from scraped city names to IATA codes
CITY_TO_IATA = {
    # Nepal Domestic (Comprehensive list)
    "Kathmandu": "KTM",
    "Pokhara": "PKR",
    "Bhairahawa": "BWA",
    "Biratnagar": "BIR",
    "Janakpur": "BJU",
    "Dhangadhi": "DHI",
    "Bhadrapur": "BDP",
    "Nepalgunj": "KEP",
    "Simara": "SIF",
    "Simara Airport": "SIF",
    "Bharatpur": "BHR",
    "Lukla": "LUA",
    "Rumjatar": "RUM",
    "Rumjatar Airport": "RUM",
    "Mountain Flight": "MTN",

    # Additional Nepal Domestic
    "Surkhet": "SKH",
    "Tumlingtar": "TMI",
    "Rajbiraj": "RJB",
    "Dang": "DNP",
    "Tulsipur": "DNP",
    "Resunga": "RSG",
    "Meghauli": "MEY",
    "Dolpa": "DOP",
    "Jumla": "JUM",
    "Jomsom": "JMO",
    "Manang": "NGX",
    "Phaplu": "PPL",
    "Lamidanda": "LDN",
    "Taplejung": "TPJ",
    "Bajhang": "BJH",
    "Bajura": "BJU",
    "Rara": "RRA",
    "Simikot": "IMK",
    "Talcha": "TCH",
    "Doti": "DOT",
    "Sanfebagar": "SFB",
    "Birendranagar": "SKH",  # Same as Surkhet

    # International
    "Delhi": "DEL",
    "Doha": "DOH",
    "Dubai": "DXB",
    "Dhaka": "DAC",
    "Bangkok": "BKK",
    "Kuala Lumpur": "KUL",
    "Singapore": "SIN",
    "Hong Kong": "HKG",
    "Guangzhou": "CAN",
    "Sharjah": "SHJ",
    "Tokyo": "NRT",
    "Narita": "NRT",
    "Kuwait": "KWI",
    "Dammam": "DMM",
    "Seoul": "ICN",
    "Seoul/Incheon": "ICN",
    "Incheon": "ICN",
    "Paro": "PBH",
    "Abu Dhabi": "AUH",
    "Kolkata": "CCU",
    "Istanbul": "IST",
    "Tianfu": "TFU",
    "Chengdu": "TFU",
    "Colombo": "CMB",
    "Mumbai": "BOM",
    "Banglore": "BLR",
    "Bangalore": "BLR",
    "Hyderabad": "HYD",
    "Chennai": "MAA",
    "Muscat": "MCT",
    "Riyadh": "RUH",
    "Jeddah": "JED",
    "Bahrain": "BAH",
    "Osaka": "KIX",
    "Beijing": "PEK",
    "Shanghai": "PVG",
    "Lhasa": "LXA",
    "Kunming": "KMG",
}


def get_iata_code(city_name: str) -> str:
    """
    Get IATA code for a city name.
    Returns None if not found (caller should handle auto-discovery).
    """
    if not city_name:
        return None

    # Clean city name
    city_clean = city_name.strip()

    # Try exact match first
    if city_clean in CITY_TO_IATA:
        return CITY_TO_IATA[city_clean]

    # Try case-insensitive match
    city_lower = city_clean.lower()
    for key, value in CITY_TO_IATA.items():
        if key.lower() == city_lower:
            return value

    # Try partial match (contains)
    for key, value in CITY_TO_IATA.items():
        if key.lower() in city_lower or city_lower in key.lower():
            return value

    # Not found - return None to trigger auto-discovery
    return None


def generate_iata_code(city_name: str) -> str:
    """
    Generate a pseudo-IATA code for an unknown airport.
    Uses first 3 letters of city name in uppercase.
    Real IATA codes should be added to CITY_TO_IATA when discovered.
    """
    if not city_name:
        return "UNK"

    # Clean and take first 3 chars
    clean = ''.join(c for c in city_name if c.isalpha())
    return clean[:3].upper() if len(clean) >= 3 else clean.upper().ljust(3, 'X')
