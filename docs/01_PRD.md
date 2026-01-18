# Product Requirements Document (PRD)
## Nepal Flight Delay Prediction - Data Pipeline

---

## 1. Executive Summary

Build a robust data pipeline to collect, store, and track flight data from Nepal airports for machine learning-based delay prediction. The system will scrape flight information every 30 minutes, store it in Supabase, and track status changes over time to create a rich dataset for ML training.

---

## 2. Problem Statement

Flight delays in Nepal cause significant inconvenience for travelers. Currently, there is no predictive system to forecast delays. To build such a system, we need:

1. **Historical flight data** with delay patterns
2. **Status change tracking** (how delays develop over time)
3. **External data integration** (weather, holidays, etc.)
4. **Multi-airport support** for comprehensive coverage

---

## 3. Goals & Objectives

| Goal | Success Metric |
|------|----------------|
| Reliable data collection | 99% scrape success rate |
| Comprehensive delay tracking | Capture all status transitions |
| Data quality | <1% duplicate or corrupted records |
| ML-ready dataset | Sufficient features for prediction |

---

## 4. Scope

### In Scope (Phase 1)
- ✅ Store flight data in Supabase (PostgreSQL)
- ✅ Track flight status changes over time
- ✅ Handle same flight number doing multiple daily trips
- ✅ Support domestic and international flights
- ✅ Calculate both predicted delays (scheduled vs estimated) and actual delays
- ✅ Multi-airport architecture (TIA initially, expandable)
- ✅ Weather data integration structure

### Out of Scope (Phase 1)
- ❌ ML model training and deployment
- ❌ User-facing dashboard/API
- ❌ Real-time notifications

---

## 5. Key Concepts & Definitions

### 5.1 Delay Types

```
┌─────────────────────────────────────────────────────────────────┐
│                      DELAY CLASSIFICATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PREDICTED DELAY = Estimated Time - Scheduled Time              │
│  ├── Captured BEFORE flight departs/arrives                     │
│  └── Indicates airline's expectation of delay                   │
│                                                                  │
│  ACTUAL DELAY = Actual Time - Scheduled Time                    │
│  ├── Captured AFTER flight departs/arrives                      │
│  └── The real delay that occurred                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Flight Instance Uniqueness

> [!IMPORTANT]
> A flight number alone does NOT uniquely identify a flight!

**Example**: Buddha Air BHA710 (Kathmandu ↔ Biratnagar)
- Can operate 3-4 times daily
- Same flight number, different trips

**Unique Flight Instance** = `Flight Number` + `Date` + `Scheduled Time` + `Route Direction`

---

## 6. Data Sources

### 6.1 Primary Source: TIA Website Scraper
- **URL**: https://www.tiairport.com.np/all-flights
- **Frequency**: Every 30 minutes
- **Data Types**:
  - International Arrivals
  - International Departures
  - Domestic Arrivals
  - Domestic Departures

### 6.2 Secondary Sources (Future)
| Source | Data Type | Purpose |
|--------|-----------|---------|
| OpenWeatherMap API | Weather data | Correlate delays with weather |
| Nepal Calendar API | Holidays/Events | Festival traffic patterns |
| Other Airport Sites | Multi-airport data | Broader coverage |

---

## 7. Functional Requirements

### FR-1: Flight Data Storage
- Store all scraped flight records
- Link to airline, airport, and route entities
- Maintain scrape timestamp for each record

### FR-2: Flight Instance Identification
- Generate unique identifiers for each flight instance
- Handle same flight number with multiple daily trips
- Support route-based identification (origin/destination pairs)

### FR-3: Status Change Tracking
- Track every status change for each flight instance
- Record timestamp of each status observation
- Calculate delay at each observation point

### FR-4: Delay Calculation
- Calculate predicted delay (estimated - scheduled)
- Calculate actual delay (actual - scheduled)
- Store both in minutes for ML feature extraction

### FR-5: Multi-Airport Support
- Architecture supports multiple airports
- Each airport has its own scraper configuration
- Data normalized across airports

### FR-6: Weather Integration
- Store weather snapshots at scrape time
- Link weather to airport and timestamp
- Support multiple weather data points

---

## 8. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Data Retention | Minimum 2 years for ML training |
| Scrape Reliability | Handle Cloudflare, rate limits gracefully |
| Data Integrity | PostgreSQL constraints, no orphan records |
| Scalability | Support 10,000+ flight instances/month |
| Time Zones | All times stored in UTC, converted for display |

---

## 9. Assumptions & Constraints

### Assumptions
- TIA website structure remains relatively stable
- 30-minute scrape interval captures most status changes
- Flight numbers follow consistent naming patterns

### Constraints
- Cloudflare protection may require manual intervention
- Website may have downtime during updates
- Historical data only available from when scraping begins

---

## 10. Success Criteria

1. **Data Collection**: Successfully storing >95% of scraped flights
2. **Status Tracking**: Capturing average 3+ status changes per flight
3. **Delay Accuracy**: Predicted vs actual delay correlation >70%
4. **Data Quality**: <0.5% data anomalies requiring cleanup
