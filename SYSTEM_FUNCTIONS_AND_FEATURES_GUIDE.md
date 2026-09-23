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

### 2.1. Trained XGBoost Landslide Susceptibility Model & SHAP Explainer
* **File Location:** [`ai_engine/main.py`](file:///ai_engine/main.py), [`ai_engine/train.py`](file:///ai_engine/train.py), [`ai_engine/models/xgboost_landslide_model.json`](file:///ai_engine/models/xgboost_landslide_model.json)
* **Function:** `POST /predict-risk`, `POST /api/v1/predict-risk`, and `GET /api/v1/risk-forecast`
* **ML Model:** Gradient Boosted Decision Trees (`xgb.XGBClassifier`) trained on a 19-feature geological-hydrometeorological dataset (1,500 samples, 80/20 train/test split).
* **Held-Out Test Set Metrics (Evaluated):**
  - **Accuracy:** `82.33%`
  - **Precision:** `80.71%`
  - **Recall:** `81.29%`
  - **F1-Score:** `0.8100`
  - **ROC-AUC:** `0.8841`
  - **PR-AUC:** `0.8560`
* **Explainable AI (SHAP TreeExplainer):**
  Uses Shapley additive values to decompose every prediction into positive risk drivers (e.g. 24h rainfall exceeding saturation threshold, steep slope shear) and protective stabilizing factors (gentle terrain, well-drained soil).
* **Output Risk Levels:**
  - $P(\text{landslide}) \ge 0.80$ or $R_{24} \ge 150\text{mm} \implies$ 🔴 **CRITICAL (Mandatory Evacuation & Highway Closure)**
  - $0.60 \le P < 0.80 \implies$ 🟠 **HIGH (Pre-evacuation Alert & Transport Restrictions)**
  - $0.35 \le P < 0.60 \implies$ 🟡 **AMBER (Pre-warning & Shelter Readiness)**
  - $P < 0.35 \implies$ 🟢 **GREEN (Routine Monitoring Active)**
* **Note on Legacy Heuristic Baseline:**
  An earlier linear weighted sum formula ($S = 0.35\cdot\text{Slope} + 0.30\cdot R_{24} + 0.20\cdot\Theta_{\text{soil}} + 0.15\cdot R_{72}$) is preserved in Java (`LandslidePredictorEngine.java`) as an offline fallback rule-based scoring method.

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

### 3.2. `AiVisionScanner.tsx` (Forensic Computer Vision Hazard Feature Extractor)
* **Path:** `frontend/src/components/report/AiVisionScanner.tsx`
* **Function:** `processImage(file: File)`
* **Kaam Kya Hai (Purpose):**
  Jab citizen kisi sadak ya pahad ki photo upload karta hai, Canvas pixel edge-tensor scanner (Laplacian noise variance & Bayer color channel response) image me surface cracks, mudflow discoloration aur road fracture extract karta hai.
* **Integrity Status:**
  Traditional computer vision / heuristic feature analysis (clearly distinguished from deep learning). Pluggable adapter architecture ready for custom YOLOv8 / CNN model weights. All predictions require officer ground verification.

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

### 4.1. AI Engine Microservice (FastAPI - Port 8000)

| Method | Endpoint | Handler File | Description |
|---|---|---|---|
| `POST` | `/predict-risk` / `/api/v1/predict-risk` | `ai_engine/main.py` | Production trained XGBoost Landslide Susceptibility Model (v1.0) with dynamic TreeSHAP feature attributions and factor breakdowns |
| `GET` | `/api/v1/risk-forecast` | `ai_engine/main.py` | Multi-horizon predictive risk forecast across $T+0\text{h}, +6\text{h}, +12\text{h}, +24\text{h}, +48\text{h}$ with directional risk trend calculation |
| `POST` | `/api/v1/simulate-risk` | `ai_engine/main.py` | Interactive "What-If" parameter simulation workbench for disaster managers to test rainfall and slope interventions |
| `POST` | `/api/v1/sensor-data` | `ai_engine/main.py` | Geotechnical IoT telemetry ingestion (Pore pressure, Inclinometer displacement, Soil moisture, Vibration) |
| `GET` | `/api/v1/sensor-data/recent` | `ai_engine/main.py` | Retrieve real-time telemetry buffer and sensor battery/status telemetry |
| `GET` | `/model-info` | `ai_engine/main.py` | Authentic held-out test evaluations (Accuracy, Precision, Recall, F1, ROC-AUC) and model registry metadata |
| `GET` | `/api/v1/risk-assessment` | `ai_engine/main.py` | Comprehensive multi-factor AI landslide susceptibility score, weather breakdown & evacuation detour routing |
| `GET` | `/api/v1/weather/live` | `ai_engine/main.py` | Live 24h/72h precipitation & multi-layer volumetric soil moisture telemetry from Open-Meteo & OpenWeather |
| `GET` | `/api/v1/terrain/elevation`| `ai_engine/main.py` | Live NASA SRTM 30m Global DEM point elevation & topographic slope from OpenTopography |
| `GET` | `/health` | `ai_engine/main.py` | Cluster container and model availability verification |

### 4.2. Core Spring Boot Gateway & Cloud Services (Port 8080)

| Method | Endpoint | Handler File | Description |
|---|---|---|---|
| `GET` | `/api/risk/heatmap` | `RiskController.java` | Geospatial list of all 30 monitored NER hill regions with severity status |
| `POST`| `/api/reports/` | `ReportController.java` | Citizen incident report submission (Online direct / Offline IndexedDB sync) |
| `GET` | `/api/v1/risk-assessment` | `RiskAssessmentController.java` | Java backend routing fallback for risk score and bypass corridor |
| `GET` | `/health` | `HealthController.java` | Cloud cluster container health verification |

---

## 5. Summary Table for Presentations / Viva

| Feature / Module | Technology Stack | Key Functionality & Authentic Specifications |
|---|---|---|
| **AI Susceptibility Engine** | Python FastAPI / XGBoost v1.0 | Trained on 1,500 GSI-calibrated NER hill samples across 19 geotechnical/met features. Held-out test accuracy: **82.33%**, ROC-AUC: **0.8841**, F1: **0.8100**. Linear formula preserved as offline embedded fallback. |
| **Explainable AI (XAI)** | SHAP (TreeExplainer) | Real-time Shapley attributions explaining exact contributing push factors (rainfall, slope, soil moisture) for every prediction. |
| **Multi-Horizon Forecasting** | FastAPI Temporal Predictor | Dynamic temporal risk curves across $T+0, +6\text{h}, +12\text{h}, +24\text{h}, +48\text{h}$ with automated trend velocity (RAPIDLY_INCREASING, STABLE, DECREASING). |
| **What-If Simulation Workbench** | FastAPI / React Control Panel | Interactive parameter perturbation allowing disaster managers to stress-test scenarios before declaring evacuations. |
| **IoT Sensor Telemetry Buffer** | In-memory Geotechnical Sink | Ingestion for borehole inclinometers, vibrating wire piezometers, and soil probes with hardware health status. |
| **Dynamic Highway Detour** | NetworkX Graph Engine | Dijkstra-based shortest safe route calculation blocking compromised corridors (e.g., NH-766) and rerouting via bypasses (SH-59). |
| **Forensic Hazard Vision** | HTML5 Canvas + Edge Tensor | Transparent heuristic computer vision measuring Laplacian edge density and Bayer saturation for tension cracks & asphalt fractures. |
| **3D Terrain Simulation** | Three.js + WebGL | Interactive 3D mountain elevation mesh with animated debris flow particle trajectory. |
| **Interactive GIS Map** | Leaflet / OpenStreetMap | Real-time risk heatmaps, historical landslide playback (2019–2026), and critical infrastructure proximity alerts. |
| **Voice Assistant & IVRS** | Web Speech API | Multilingual Text-to-Speech & Voice Speech-to-Text disaster reporting in regional languages. |
| **Relief Camp Logistics** | React Resource Manager | Real-time capacity and stock tracking of shelter beds, food rations, water & medical units. |
| **Offline SOS Mesh** | Web BLE / P2P Simulation | Zero-internet emergency distress signal broadcast relaying coordinates & casualty counts. |

---
*SATARK — AI-Based Early Warning and Landslide Risk Monitoring System in NER · Authors: Team EWS-NER*

