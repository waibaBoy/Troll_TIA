-- Migration 002: Seed Airports
-- Run this in Supabase SQL Editor after 001_create_schema.sql

-- Nepal Airports
INSERT INTO flight_data.airports (iata_code, icao_code, name, city, country, is_primary, latitude, longitude) VALUES
('KTM', 'VNKT', 'Tribhuvan International Airport', 'Kathmandu', 'Nepal', true, 27.6966, 85.3591),
('PKR', 'VNPK', 'Pokhara International Airport', 'Pokhara', 'Nepal', false, 28.2009, 83.9821),
('BWA', 'VNBW', 'Gautam Buddha International Airport', 'Bhairahawa', 'Nepal', false, 27.5056, 83.4164),
('BIR', 'VNVT', 'Biratnagar Airport', 'Biratnagar', 'Nepal', false, 26.4815, 87.2640),
('BJU', 'VNBJ', 'Janakpur Airport', 'Janakpur', 'Nepal', false, 26.7088, 85.9224),
('DHI', 'VNDH', 'Dhangadhi Airport', 'Dhangadhi', 'Nepal', false, 28.7533, 80.5819),
('BDP', 'VNBD', 'Bhadrapur Airport', 'Bhadrapur', 'Nepal', false, 26.5708, 88.0796),
('KEP', 'VNNG', 'Nepalgunj Airport', 'Nepalgunj', 'Nepal', false, 28.1036, 81.6670),
('SIF', 'VNSI', 'Simara Airport', 'Simara', 'Nepal', false, 27.1595, 84.9801)
ON CONFLICT (iata_code) DO NOTHING;

-- Common International Destinations (from your data)
INSERT INTO flight_data.airports (iata_code, icao_code, name, city, country, latitude, longitude, timezone) VALUES
('DEL', 'VIDP', 'Indira Gandhi International Airport', 'Delhi', 'India', 28.5562, 77.1000, 'Asia/Kolkata'),
('DOH', 'OTHH', 'Hamad International Airport', 'Doha', 'Qatar', 25.2731, 51.6081, 'Asia/Qatar'),
('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'UAE', 25.2532, 55.3657, 'Asia/Dubai'),
('DAC', 'VGHS', 'Shahjalal International Airport', 'Dhaka', 'Bangladesh', 23.8433, 90.3978, 'Asia/Dhaka'),
('BKK', 'VTBS', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand', 13.6900, 100.7501, 'Asia/Bangkok'),
('KUL', 'WMKK', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia', 2.7456, 101.7099, 'Asia/Kuala_Lumpur'),
('SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 1.3644, 103.9915, 'Asia/Singapore'),
('HKG', 'VHHH', 'Hong Kong International Airport', 'Hong Kong', 'Hong Kong', 22.3080, 113.9185, 'Asia/Hong_Kong'),
('CAN', 'ZGGG', 'Guangzhou Baiyun International Airport', 'Guangzhou', 'China', 23.3925, 113.2988, 'Asia/Shanghai'),
('SHJ', 'OMSJ', 'Sharjah International Airport', 'Sharjah', 'UAE', 25.3286, 55.5172, 'Asia/Dubai'),
('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 35.7720, 140.3929, 'Asia/Tokyo'),
('KWI', 'OKBK', 'Kuwait International Airport', 'Kuwait', 'Kuwait', 29.2266, 47.9689, 'Asia/Kuwait'),
('DMM', 'OEDF', 'King Fahd International Airport', 'Dammam', 'Saudi Arabia', 26.4712, 49.7979, 'Asia/Riyadh')
ON CONFLICT (iata_code) DO NOTHING;
