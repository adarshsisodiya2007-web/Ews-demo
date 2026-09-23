# 🛰️ SATARK — Landslide Early Warning System (NER)
### Smart India Hackathon (SIH) 2026 · Problem Statement SIH 26001

> **SATARK** is an AI-driven, multi-hazard disaster early warning, risk assessment, offline mesh rescue, and incident response platform designed specifically for the rugged terrain of Northeast India.

---

## 🌟 Quick Links

- **AI Model Documentation**: See [AI_MODEL_DOCUMENTATION.md](AI_MODEL_DOCUMENTATION.md) for full training methodology, benchmark metrics, feature importance, and SHAP explainability.
- **System Features & Functions Guide**: See [SYSTEM_FUNCTIONS_AND_FEATURES_GUIDE.md](SYSTEM_FUNCTIONS_AND_FEATURES_GUIDE.md) for module-by-module breakdown and REST endpoints.
- **Handover Guide**: See [HANDOVER_README.md](HANDOVER_README.md) for developer onboarding, architecture, and deployment instructions.
- **Production Web Application**: [https://satark.vercel.app](https://satark.vercel.app) (also accessible at [https://landslide-ews.vercel.app](https://landslide-ews.vercel.app))
- **Production Spring Boot API**: [https://ews-backend-gateway-vck8.onrender.com](https://ews-backend-gateway-vck8.onrender.com)
- **GitHub Repository**: [https://github.com/adarshsisodiya2007-web/Ews-demo](https://github.com/adarshsisodiya2007-web/Ews-demo) (Branch: `feature/satark-ai-risk-engine`)

---

## 🏗️ Architecture Overview

1. **AI / ML Microservice (`ai_engine/`)**:
   - **XGBoost Landslide Susceptibility Model (v1.0)**: Trained on 1,500 anchor-calibrated semi-synthetic samples grounded on 17 Geological Survey of India (GSI) historical disaster centroids across Northeast India and Western Ghats testbeds.
   - **Explainable AI (XAI)**: Live TreeSHAP feature attributions calculating exact per-factor push scores for disaster managers.
   - **Multi-Horizon Risk Forecasting**: Temporal hazard trajectories ($T+0, +6\text{h}, +12\text{h}, +24\text{h}, +48\text{h}$) with dynamic velocity indicators.
   - **Interactive What-If Simulation**: Parameter stress-testing workbench for rainfall and slope interventions.
   - **IoT Telemetry Sink**: Real-time buffer for borehole inclinometers, vibrating wire piezometers, and soil probes.
   - **Dynamic Evacuation Routing**: NetworkX Dijkstra shortest safe route engine bypassing active hazard polygons.

2. **Frontend (Web & PWA - `frontend/`)**:
   - React 18, Vite, TypeScript, Tailwind CSS, Lucide icons.
   - Leaflet GIS mapping with live risk heatmap overlays, historical landslide playback (2019–2026), and critical infrastructure proximity alerts.
   - Explainability waterfall panel with human-readable geotechnical interpretations.
   - Service Worker & IndexedDB offline queue for zero-connectivity field reporting.
   - Bilingual support (English & Hindi) with Web Speech API voice assistant.
   - Forensic Hazard Feature Extractor (heuristic canvas edge & colorimetric analysis with pluggable deep-learning hooks).

3. **Backend API Gateway (`backend/`)**:
   - Spring Boot 3.3.x, Java 21, Spring Security with stateless JWT.
   - Flyway database migrations (V1 to V8).
   - Real-time WebSocket (STOMP) alert ticker.
   - MinIO / S3 object storage for citizen photo evidence.

4. **Mobile App (Android - `frontend/android/`)**:
   - Native Android wrapper powered by Capacitor 8.
   - Offline GIS caching, native Geolocation GPS, Camera integration.
   - Tested & buildable with Android Studio / Gradle on Android SDK 34–36.

---

## 📊 Authentic Model Benchmark & Evaluation

All metrics are evaluated on an 80/20 held-out test split (1,200 training samples / 300 test samples):

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Status |
|---|---|---|---|---|---|---|---|
| **Logistic Regression (Baseline)** | 83.33% | 82.48% | 81.29% | 0.8188 | 0.8888 | 0.8745 | Benchmark Baseline |
| **Random Forest (100 Trees)** | 82.00% | 81.95% | 78.42% | 0.8015 | 0.8840 | 0.8681 | Candidate Model |
| **XGBoost v1.0 (Production Model)** | **82.33%** | **80.71%** | **81.29%** | **0.8100** | **0.8841** | **0.8560** | **Active Production** |

- **Spatial Cross-Validation (4-Fold Cluster CV)**: Mean Accuracy **81.92%**, Mean ROC-AUC **0.8845**, Mean F1 **0.8157**.
- **Dataset Provenance**: Anchor-calibrated semi-synthetic simulation (1,500 rows, 19 features, 0 missing, 0 duplicates) generated around 17 historical GSI/NDMA disaster centroids.
- *Note: The legacy linear formula ($S = 0.35\cdot\text{Slope} + 0.30\cdot R_{24} + 0.20\cdot\Theta + 0.15\cdot R_{72}$) is retained in `LandslidePredictorEngine.java` as an offline embedded fallback when the AI microservice is unreachable.*

---

## ⚡ Quick Start for Developers

### Prerequisites
- Node.js 20+
- Python 3.10+ (Recommended: Python 3.11 / 3.12 / 3.13)
- Java JDK 21 (Optional for frontend/AI testing; required for local Spring Boot)
- Docker Desktop (Optional; for local PostgreSQL & MinIO)

### 1. Run Python AI Engine (FastAPI)
```bash
cd ai_engine
# Create & activate virtual environment (optional)
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1 | Linux/Mac: source venv/bin/activate
pip install -r requirements.txt

# (Optional) Retrain model & regenerate benchmarks
python train.py

# Run API microservice
python main.py
```
*AI microservice starts at `http://localhost:8000` (`/docs` for interactive Swagger UI).*

### 2. Run Test Suite for AI Engine
```bash
cd ai_engine
python test_api.py
```

### 3. Run Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

### 4. Build Frontend for Production / Android
```bash
cd frontend
npm run build
# Sync to Android Capacitor project
npx cap sync android
```

### 5. Run Spring Boot Backend (Optional / Cloud Gateway)
```bash
cd backend
mvn spring-boot:run
```
*Or connect frontend directly to the deployed cloud gateway (`https://ews-backend-gateway-vck8.onrender.com`).*

---

## 🔑 Demo Access Credentials

| Portal | URL Route | Credentials | Role / Notes |
|---|---|---|---|
| **Citizen Portal** | `/citizen` | Any mobile number + OTP `123456` | Incident reports, SOS distress, safe camps |
| **Admin Officer** | `/login` | `admin` / `demo1234` | Full command access, ML Registry, Simulation |
| **District Officer** | `/login` | `kamrup_official` / `demo1234` | Kamrup sector operations |
| **Shillong Officer** | `/login` | `ekh_official` / `demo1234` | East Khasi Hills operations |
| **Aizawl Officer** | `/login` | `aizawl_officer` / `demo1234` | Aizawl corridor operations |
| **Responder Portal** | `/responder` | Direct access or via TopBar | Tactical road status, triage, BLE mesh |

---

## 🔬 System Integrity & Transparency

- **ML Models**: All reported metrics (82.33% accuracy, 0.8841 ROC-AUC) are computed on actual held-out validation data and recorded in `ai_engine/models/comparison_report.json`.
- **Explainability**: SHAP scores are dynamically computed per prediction using `shap.TreeExplainer`.
- **Heuristic Image Analysis**: The camera scanner is explicitly documented as a forensic heuristic feature extractor (Laplacian edge density + RGB chroma), ready for deep learning object detection plug-ins.
- **Simulation Features**: The BLE Mesh SOS and What-If parameter sliders are clearly marked in the UI as simulation and tactical testing tools.

---
*Created for Smart India Hackathon (SIH) 2026 · Problem Statement SIH 26001*
