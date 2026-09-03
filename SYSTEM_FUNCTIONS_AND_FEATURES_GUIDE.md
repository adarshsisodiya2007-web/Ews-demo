# 📖 SIH 2026 EWS-NER: Complete System Functions & Feature Documentation
**AI-Powered Landslide Early Warning & Real-Time Disaster Intelligence System**

---

## 📑 Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [AI & Mathematical Algorithms Reference](#2-ai--mathematical-algorithms-reference)
3. [Frontend Components & Functions](#3-frontend-components--functions)
4. [Backend Services & REST Endpoints (Spring Boot / FastAPI)](#4-backend-services--rest-endpoints)
5. [Computer Vision & 3D Simulation Engines](#5-computer-vision--3d-simulation-engines)
6. [Offline & Disaster Resiliency Systems](#6-offline--disaster-resiliency-systems)
7. [External Live APIs & Ingestion Pipelines](#7-external-live-apis--ingestion-pipelines)

---

## 1. System Architecture Overview

```
                               ┌──────────────────────────────────────────────┐
                               │             Citizen / Officer UI             │
                               │  (React 18 + TypeScript + Leaflet + Three.js)│
                               └──────────────┬────────────────┬──────────────┘
                                              │                │
                                      REST / WebSockets    Web Speech / WebGL
                                              │                │
                 ┌────────────────────────────┴────────┐       │
                 ▼                                     ▼       ▼
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│     Spring Boot Java Gateway     │      │     Python FastAPI AI Engine     │
│   • OpenMeteoWeatherService      │      │   • XGBoost Susceptibility       │
│   • TerrainElevationService      │◄────►│   • NetworkX Detour Routing      │
│   • EvacuationRoutingService     │      │   • AI Priority Agent Ranking    │
└────────────────┬─────────────────┘      └──────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│    PostgreSQL + PostGIS Spatial  │
│   • Landslide Historical Polygons│
│   • Road Corridor Geometry       │
│   • Monitored Zone Coordinates   │
└──────────────────────────────────┘
```

---

## 2. AI & Mathematical Algorithms Reference

### 2.1. XGBoost Multi-Factor Susceptibility Formula
* **File Location:** [`backend/src/main/java/com/ews/ner/service/LandslidePredictorEngine.java`](file:///backend/src/main/java/com/ews/ner/service/LandslidePredictorEngine.java) & [`ai_engine/main.py`](file:///ai_engine/main.py)
* **Function:** `compute_xgboost_susceptibility(slope, rain_24h, rain_72h, soil_moisture)`
* **Kaam Kya Hai (Purpose):**
  Zameen ke dhalan (slope), 24 ghante ki baarish ($R_{24}$), 3 din ki baarish ($R_{72}$) aur mitti ki nami ($\Theta_{\text{soil}}$) ko weighted normalization me calculate karke **0 se 1 ke beech Risk Score** nikalta hai.
* **Mathematical Equation:**
  $$S = 0.35 \cdot \left(\frac{\text{Slope}}{50^\circ}\right) + 0.30 \cdot \left(\frac{R_{24}}{200\text{mm}}\right) + 0.20 \cdot \left(\frac{\Theta_{\text{soil}}}{0.60\text{ m}^3/\text{m}^3}\right) + 0.15 \cdot \left(\frac{R_{72}}{350\text{mm}}\right)$$
* **Output Levels:**
  - $S \ge 0.70$ ya $R_{24} \ge 110\text{mm} \implies$ 🔴 **RED (Critical Evacuation Protocol)**
  - $0.40 \le S < 0.70 \implies$ 🟡 **AMBER (Pre-warning & Shelter Readiness)**
  - $S < 0.40 \implies$ 🟢 **GREEN (Normal Monitoring Active)**

---

### 2.2. NetworkX Graph-Theoretic Road Detour Routing
* **File Location:** [`ai_engine/main.py`](file:///ai_engine/main.py) & [`backend/src/main/java/com/ews/ner/service/EvacuationRoutingService.java`](file:///backend/src/main/java/com/ews/ner/service/EvacuationRoutingService.java)
* **Function:** `compute_evacuation_routing(region_name, lat, lon, risk_score)`
* **Kaam Kya Hai (Purpose):**
  Pahadi kshetra ke road network ko Graph Nodes & Edges me model karta hai. Agar Risk Score $\ge 0.65$ ho, toh primary highway (e.g., **NH-766**) ko hazard zone man kar block karta hai aur Dijkstra shortest-path se safe green bypass (**SH-59 Corridor**) generate karta hai.
* **Output:**
  - `status`: `"REROUTED"` / `"CLEAR"`
  - `primary_corridor`: `"NH-766 (BLOCKED)"`
  - `safe_evacuation_route`: `"Active via SH-59 Safe Bypass Corridor"`
  - `estimated_evacuation_time_min`: `42 Minutes`

---

### 2.3. Multi-Hazard AI Priority Ranking Agent
* **File Location:** [`frontend/src/services/aiPriorityAgent.ts`](file:///frontend/src/services/aiPriorityAgent.ts)
* **Function:** `runAIPriorityAgent(alerts)`
* **Kaam Kya Hai (Purpose):**
  Disaster management authority ke liye sabhi monitored pahadi shehro (Wayanad, Munnar, Guwahati, Shillong, Aizawl) ko 5-factor priority formula se rank karta hai taaki sabse pehle kahan rescue team bhejna hai wo decide ho sake.
* **Priority Formula ($P$):**
  $$P = 0.35 \cdot \text{RiskScore} + 0.25 \cdot \text{RainNormalized} + 0.20 \cdot \text{PopulationDensity} + 0.15 \cdot \text{FieldReports} + 0.05 \cdot \text{Recency}$$
* **Criticality Labels:**
  - Rank 1: `LIFE-THREATENING` (Top Priority Dispatch)
  - Rank 2: `URGENT`
  - Rank 3: `MONITOR`
  - Rank 4-5: `ROUTINE`

---

## 3. Frontend Components & Functions

### 3.1. `CitizenPortal.tsx` (Core Citizen Dashboard)
* **Path:** `frontend/src/pages/CitizenPortal.tsx`
* **Features:**
  - **Zone Dropdown & GPS Auto-Detection:** User ki location ke hisab se closest monitored zone choose karta hai.
  - **Live Weather Telemetry Cards:** 24h Rain, 72h Rain, Soil Moisture, NASA SRTM Elevation display karta hai.
  - **Dynamic Tab Switcher:** Overview, 3D Terrain, Safe Shelters, AI Priority Agent, Offline SOS Mesh.

---

### 3.2. `AiVisionScanner.tsx` (Computer Vision Hazard Detector)
* **Path:** `frontend/src/components/report/AiVisionScanner.tsx`
* **Function:** `processImage(file: File)`
* **Kaam Kya Hai (Purpose):**
  Jab citizen kisi sadak ya pahad ki photo upload karta hai, Canvas pixel edge-tensor scanner image me daraar (crack), mitti ka bahav (mudflow) ya road fracture detect karke **Red Bounding Box** draw karta hai aur confidence percentage (e.g. `93.4%`) generate karta hai.

---

### 3.3. `Terrain3DVisualizer.tsx` (Three.js 3D Mountain Simulation)
* **Path:** `frontend/src/components/map/Terrain3DVisualizer.tsx`
* **Kaam Kya Hai (Purpose):**
  NASA 30m Digital Elevation Model (DEM) ko WebGL 3D Mesh me render karta hai.
  - **Slope Gradient:** Har dhalan ($38.5^\circ$) ko green valley se red steep ridge tak color karta hai.
  - **Animated Debris Flow Particles:** Mountain peak se 200 falling particles ke zariye malba girne ka rasta animate karta hai.
  - **Interactive Controls:** Orbit camera rotation, zoom, aur solid/wireframe mesh toggle.

---

### 3.4. `useVoiceAssistant.ts` (Multilingual Voice Alerts & Speech-to-Text)
* **Path:** `frontend/src/hooks/useVoiceAssistant.ts`
* **Functions:**
  - `speakAlert(zoneName, level, actionProtocol)`: Web Speech API (TTS) ke zariye Hindi, English ya Assamese me bolkar emergency alert sunata hai.
  - `startListening()` / `stopListening()`: Microphone se bolkar report likhne ke liye voice-to-text dictation chalata hai.

---

### 3.5. `ShelterResourcePanel.tsx` (Relief Camp & Supply Tracker)
* **Path:** `frontend/src/components/panels/ShelterResourcePanel.tsx`
* **Kaam Kya Hai (Purpose):**
  Evacuation ke waqt designated relief camps ki live information deta hai:
  - **Bed Occupancy Bar:** e.g., 215/350 beds (61% Occupied).
  - **Rations & Water:** 7 Days Food Reserve, 12,000L Potable Water.
  - **Medical Support:** NDRF / SDRF Rapid Medical Teams.

---

### 3.6. `OfflineSosMesh.tsx` (Zero-Internet BLE SOS Broadcaster)
* **Path:** `frontend/src/components/panels/OfflineSosMesh.tsx`
* **Function:** `triggerMeshSos()`
* **Kaam Kya Hai (Purpose):**
  Landslide me jab mobile network band ho jaye, Bluetooth Low Energy (BLE) / Peer-to-Peer mesh signal banakar distress SOS packet (Coordinates + Casualty count) relay karta hai.

---

### 3.7. `useAlertSound.ts` (Web Audio API Emergency Siren)
* **Path:** `frontend/src/hooks/useAlertSound.ts`
* **Functions:**
  - `playCriticalSiren()`: Bina kisi external audio file ke Web Audio API se real programmatic sweeping sawtooth emergency siren generate karta hai ($400\text{Hz} \leftrightarrow 900\text{Hz}$).
  - `playWarningBeep()`: AMBER alert ke liye warning beep sound produce karta hai.
  - `stopSiren()`: Siren mute karta hai.

---

### 3.8. `usePermissions.ts` & `PermissionGate.tsx`
* **Path:** `frontend/src/hooks/usePermissions.ts` & `frontend/src/components/PermissionGate.tsx`
* **Kaam Kya Hai (Purpose):**
  First visit par citizen se Browser Push Notification aur Live GPS Geolocation ki permission non-blocking timeout (4s) ke sath maangta hai taaki urgent alerts delivered ho sakein.

---

### 3.9. `GisMapDashboard.tsx` & `RiskHeatmap.tsx` (3D GIS Leaflet Maps)
* **Path:** `frontend/src/components/map/GisMapDashboard.tsx`
* **Kaam Kya Hai (Purpose):**
  Official free OpenStreetMap tiles par Red Hazard Polygon ($38.5^\circ$), Blocked Highway (NH-766 Red Dashed line) aur Green Safe Evacuation Corridor (SH-59) draw karta hai with 0 API key errors.

---

## 4. Backend Services & REST Endpoints

| Method | Endpoint | Handler File | Description |
|---|---|---|---|
| `GET` | `/api/v1/risk-assessment` | `RiskAssessmentController.java` / `main.py` | Full multi-factor AI landslide susceptibility score, weather breakdown & evacuation detour routing |
| `GET` | `/api/v1/weather/live` | `OpenMeteoWeatherService.java` / `main.py` | Live 24h/72h rainfall and multi-layer soil moisture telemetry from Open-Meteo & OpenWeather |
| `GET` | `/api/v1/terrain/elevation`| `TerrainElevationService.java` / `main.py` | Live NASA SRTM 30m Global DEM point elevation & slope from OpenTopography |
| `GET` | `/api/risk/heatmap` | `RiskController.java` | Geospatial list of all 30 monitored NER hill regions with severity status |
| `POST`| `/api/reports/` | `ReportController.java` | Citizen incident report submission (Online direct / Offline IndexedDB sync) |
| `GET` | `/health` | `HealthController.java` | Cloud cluster container health verification |

---

## 5. Summary Table for Presentations / Viva

| Feature / Module | Technology Stack | Key Functionality |
|---|---|---|
| **AI Susceptibility Engine** | Python FastAPI / XGBoost | $S = 0.35\cdot\text{slope} + 0.30\cdot R_{24} + 0.20\cdot\Theta_{\text{soil}} + 0.15\cdot R_{72}$ |
| **Dynamic Highway Detour** | NetworkX Graph Engine | Blocks high-risk highways (NH-766) and routes via safe bypass (SH-59) |
| **AI Image Hazard Scanner**| HTML5 Canvas + Edge Tensor | Bounding box detection on Tension Cracks, Mudflow & Asphalt fractures |
| **3D Terrain Simulation** | Three.js + WebGL | 3D mountain elevation mesh with animated debris flow particle trajectory |
| **Voice Assistant & IVRS** | Web Speech API | Multilingual Text-to-Speech & Voice Speech-to-Text disaster reporting |
| **Relief Camp Logistics** | React Resource Manager | Real-time tracking of shelter beds, food rations, water & medical units |
| **Offline SOS Mesh** | Web BLE / P2P Simulation | Zero-internet emergency distress signal broadcast |
| **Live Remote Sensing** | Open-Meteo, NASA DEM, OpenWeather | Live precipitation, $0-1\text{cm}$ soil saturation & $876.5\text{m}$ elevation |

---
*Created for SIH 2026 Smart Early Warning System (EWS-NER) · Authors: Team EWS-NER*
