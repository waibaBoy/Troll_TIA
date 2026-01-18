"""
Airport code mapping utility.
Maps city names from TIA website to IATA codes.
"""

# Mapping from scraped city names to IATA codes
CITY_TO_IATA = {
    # Nepal Domestic
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

    # New findings
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
    "Mountain Flight": "MTN",
    "Lukla": "LUA",
    "Bharatpur": "BHR",
    "Rumjatar": "RUM",
    "Rumjatar Airport": "RUM",
}


def get_iata_code(city_name: str) -> str:
    """
    Get IATA code for a city name.
    Returns the city name itself if not found (will cause error in DB).
    """
    if not city_name:
        return None

    # Try exact match first
    if city_name in CITY_TO_IATA:
        return CITY_TO_IATA[city_name]

    # Try case-insensitive match
    city_lower = city_name.lower().strip()
    for key, value in CITY_TO_IATA.items():
        if key.lower() == city_lower:
            return value

    # Try partial match
    for key, value in CITY_TO_IATA.items():
        if key.lower() in city_lower or city_lower in key.lower():
            return value

    # Return as-is (will likely fail in DB, which is intentional to catch new airports)
    print(f"⚠️  Unknown airport: {city_name}")
    return city_name
