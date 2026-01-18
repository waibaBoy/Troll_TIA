from config.supabase_config import get_supabase_client

def seed_new_airports():
    client = get_supabase_client()

    new_airports = [
        # International
        {"iata_code": "PBH", "name": "Paro International Airport", "city": "Paro", "country": "Bhutan", "latitude": 27.4032, "longitude": 89.4246, "timezone": "Asia/Thimphu"},
        {"iata_code": "AUH", "name": "Zayed International Airport", "city": "Abu Dhabi", "country": "UAE", "latitude": 24.4330, "longitude": 54.6511, "timezone": "Asia/Dubai"},
        {"iata_code": "CCU", "name": "Netaji Subhash Chandra Bose International Airport", "city": "Kolkata", "country": "India", "latitude": 22.6547, "longitude": 88.4467, "timezone": "Asia/Kolkata"},
        {"iata_code": "IST", "name": "Istanbul Airport", "city": "Istanbul", "country": "Turkey", "latitude": 41.2753, "longitude": 28.7519, "timezone": "Europe/Istanbul"},
        {"iata_code": "TFU", "name": "Chengdu Tianfu International Airport", "city": "Chengdu", "country": "China", "latitude": 30.3013, "longitude": 104.4330, "timezone": "Asia/Shanghai"},
        {"iata_code": "CMB", "name": "Bandaranaike International Airport", "city": "Colombo", "country": "Sri Lanka", "latitude": 7.1804, "longitude": 79.8841, "timezone": "Asia/Colombo"},
        {"iata_code": "BOM", "name": "Chhatrapati Shivaji Maharaj International Airport", "city": "Mumbai", "country": "India", "latitude": 19.0886, "longitude": 72.8680, "timezone": "Asia/Kolkata"},
        {"iata_code": "BLR", "name": "Kempegowda International Airport", "city": "Bangalore", "country": "India", "latitude": 13.1979, "longitude": 77.7063, "timezone": "Asia/Kolkata"},

        # Domestic / Special
        {"iata_code": "MTN", "name": "Mountain Flight", "city": "Himalayas", "country": "Nepal", "latitude": 28.0000, "longitude": 86.0000},
        {"iata_code": "LUA", "name": "Tenzing-Hillary Airport", "city": "Lukla", "country": "Nepal", "latitude": 27.6868, "longitude": 86.7290},
        {"iata_code": "BHR", "name": "Bharatpur Airport", "city": "Bharatpur", "country": "Nepal", "latitude": 27.6756, "longitude": 84.4223},
        {"iata_code": "RUM", "name": "Rumjatar Airport", "city": "Rumjatar", "country": "Nepal", "latitude": 27.3056, "longitude": 86.5528},
    ]

    print("🚀 Seeding new airports...")
    for airport in new_airports:
        print(f"  Processing {airport['iata_code']} - {airport['city']}...")
        result = client.table("airports").upsert(airport, on_conflict="iata_code").execute()

    print("✅ Done!")

if __name__ == "__main__":
    seed_new_airports()
