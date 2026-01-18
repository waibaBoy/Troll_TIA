# User Stories
## Nepal Flight Delay Prediction - Data Pipeline

---

## Epic 1: Data Collection & Storage

### US-1.1: Flight Data Ingestion
**As a** Data Engineer
**I want to** automatically ingest flight data from TIA website every 30 minutes
**So that** I have continuous flight data for ML training

**Acceptance Criteria:**
- [ ] Scraper runs on schedule without manual intervention
- [ ] All 4 flight types captured (Int/Dom × Arrival/Departure)
- [ ] Failed scrapes are logged and retried
- [ ] Data pushed to Supabase with scrape timestamp

---

### US-1.2: Unique Flight Identification
**As a** Data Engineer
**I want to** uniquely identify each flight instance even when flight numbers repeat
**So that** I can track the same flight across multiple scrapes

**Acceptance Criteria:**
- [ ] Flight instance = FlightNumber + Date + ScheduledTime + Direction
- [ ] Composite unique key prevents duplicates
- [ ] Same flight from different scrapes links to same instance

---

### US-1.3: Multi-Airport Support
**As a** Data Engineer
**I want to** store flights from multiple Nepali airports
**So that** the system scales beyond TIA

**Acceptance Criteria:**
- [ ] Airport entity with IATA/ICAO codes
- [ ] Each flight linked to origin/destination airports
- [ ] Scraper configurable per airport

---

## Epic 2: Status & Delay Tracking

### US-2.1: Status Change History
**As an** ML Engineer
**I want to** see how flight status evolved over time
**So that** I can train models on status progression patterns

**Acceptance Criteria:**
- [ ] Every status observation stored with timestamp
- [ ] Status transitions captured (e.g., "On Time" → "Delayed" → "Landed")
- [ ] At least 3-5 observations per flight on average

---

### US-2.2: Predicted Delay Calculation
**As an** ML Engineer
**I want to** calculate predicted delay (Estimated - Scheduled)
**So that** I can use early delay signals as features

**Acceptance Criteria:**
- [ ] Delay calculated in minutes at each observation
- [ ] Negative values = early arrival/departure
- [ ] Null handling for missing estimated times

---

### US-2.3: Actual Delay Capture
**As an** ML Engineer
**I want to** capture the final actual delay (Actual - Scheduled)
**So that** I have ground truth labels for training

**Acceptance Criteria:**
- [ ] Actual time captured when status = Landed/Departed/Completed
- [ ] Final delay stored on flight instance record
- [ ] Clear distinction between predicted vs actual delay

---

## Epic 3: Reference Data Management

### US-3.1: Airline Management
**As a** Data Engineer
**I want to** maintain a master list of airlines
**So that** flight records link to consistent airline entities

**Acceptance Criteria:**
- [ ] Airlines identified by IATA code (e.g., QR, BHA)
- [ ] Airline name and country stored
- [ ] New airlines auto-created on first encounter

---

### US-3.2: Route Management
**As a** Data Engineer
**I want to** track unique routes between airports
**So that** I can analyze delay patterns by route

**Acceptance Criteria:**
- [ ] Route = origin airport + destination airport
- [ ] Route type (domestic/international) derived from airports
- [ ] Distance can be added later for features

---

## Epic 4: External Data Integration

### US-4.1: Weather Data Capture
**As an** ML Engineer
**I want to** capture weather conditions at scrape time
**So that** I can correlate delays with weather

**Acceptance Criteria:**
- [ ] Weather linked to airport and timestamp
- [ ] Key metrics: temperature, visibility, precipitation, wind
- [ ] Weather API integration (OpenWeatherMap or similar)

---

### US-4.2: Special Events/Holidays
**As an** ML Engineer
**I want to** flag special dates (festivals, holidays)
**So that** I can account for seasonal patterns

**Acceptance Criteria:**
- [ ] Holiday/event table with date and type
- [ ] Nepal-specific holidays included
- [ ] Can link to increased traffic patterns

---

## Epic 5: Data Quality & Operations

### US-5.1: Scrape Monitoring
**As an** Operations Engineer
**I want to** monitor scrape success/failure rates
**So that** I can ensure data quality

**Acceptance Criteria:**
- [ ] Each scrape logged with success/failure status
- [ ] Error details captured for debugging
- [ ] Easy to query scrape history

---

### US-5.2: Data Deduplication
**As a** Data Engineer
**I want to** prevent duplicate flight observations
**So that** the dataset remains clean

**Acceptance Criteria:**
- [ ] Same status from consecutive scrapes not duplicated
- [ ] Only meaningful changes create new observations
- [ ] Dedup logic handles edge cases
