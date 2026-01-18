# Troll_TIA 🛫

An ML project to predict flight delays at Tribhuvan International Airport (TIA), Nepal.

## Overview

This project scrapes real-time flight data from TIA's website, stores it in a Supabase database, and tracks status changes over time to build a dataset for machine learning-based delay prediction.

## Features

- ✅ **Web Scraper**: Automated scraping of TIA flight data (domestic & international)
- ✅ **Supabase Integration**: Cloud database storage for ML training data
- ✅ **Status Tracking**: Captures flight status changes over time
- ✅ **Delay Calculations**: Both predicted delays (estimated vs scheduled) and actual delays
- ✅ **Multi-trip Support**: Handles same flight number doing multiple daily trips
- 🔜 **Weather Integration**: Correlate delays with weather data
- 🔜 **ML Model**: Delay prediction model (coming soon)

## Project Structure

```
Troll_TIA/
├── config/
│   └── supabase_config.py     # Supabase client configuration
├── Data/
│   ├── models.py              # Pydantic data models
│   ├── repository.py          # Database operations
│   ├── airport_codes.py       # City to IATA code mapping
│   └── supabase_integration.py # Scraper-DB bridge
├── docs/
│   ├── 01_PRD.md              # Product Requirements
│   ├── 02_user_stories.md     # User Stories
│   ├── 03_entity_analysis.md  # ER Diagram & Data Model
│   └── 04_database_schema.md  # Database Schema
├── migrations/
│   └── *.sql                  # Database migrations
├── routes/
│   └── scrape_flight_logs.py  # Main scraper
├── .env                       # Supabase credentials (git-ignored)
└── requirements.txt           # Python dependencies
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` and add your credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
3. Run the migration in Supabase SQL Editor:
   ```bash
   # Copy contents of this file to Supabase SQL Editor
   migrations/004_public_schema.sql
   ```

### 3. Run the Scraper

```bash
# Scrape and store to BOTH CSV and Supabase (recommended)
python routes/scrape_flight_logs.py --headed --supabase

# Scrape to CSV only (original behavior)
python routes/scrape_flight_logs.py --headed

# Scrape to Supabase only (no CSV files)
python routes/scrape_flight_logs.py --headed --supabase --no-csv
```

### Scraper Options

| Option | Description |
|--------|-------------|
| `--headed` | Show browser window (useful for Cloudflare verification) |
| `--supabase` | Store data in Supabase database |
| `--no-csv` | Skip CSV file output |
| `--manual` | Wait for manual Cloudflare verification |
| `--timeout N` | Seconds to wait for page elements (default: 45) |

## Database Schema

The project uses a normalized database design with:

- **airports**: Nepal and international airports
- **airlines**: Operating airlines
- **routes**: Origin-destination pairs
- **flight_schedules**: Recurring flight patterns
- **flight_instances**: Individual flight occurrences
- **flight_observations**: Status snapshots over time
- **scrape_jobs**: Scrape run tracking

See `docs/03_entity_analysis.md` for the full ER diagram.

## Delay Types

| Type | Calculation | When Available |
|------|-------------|----------------|
| **Predicted Delay** | Estimated Time - Scheduled Time | Before flight completes |
| **Actual Delay** | Actual Time - Scheduled Time | After flight completes |

## Data Sources

- **Primary**: [TIA Website](https://www.tiairport.com.np/all-flights)
- **Future**: OpenWeatherMap API, Nepal Calendar API

## Development

### Test Supabase Connection

```bash
python config/supabase_config.py
```

### View Data in Supabase

```sql
-- Flight summary view
SELECT * FROM vw_flight_summary;

-- Status history
SELECT * FROM vw_status_history;
```

## Roadmap

- [x] Web scraper for TIA
- [x] Supabase database integration
- [x] Status change tracking
- [x] Delay calculations
- [ ] Weather data integration
- [ ] Automated 30-minute scraping (cron/scheduler)
- [ ] ML model for delay prediction
- [ ] Dashboard/API for predictions

## License

See [LICENSE](LICENSE) for details.
