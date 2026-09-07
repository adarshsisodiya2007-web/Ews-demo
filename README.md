# 🛰️ SATARK — Landslide Early Warning System (NER)
### Smart India Hackathon (SIH) 2026 · Problem Statement SIH 26001

> **SATARK** is an AI-driven, multi-hazard disaster early warning, risk assessment, offline mesh rescue, and incident response platform designed specifically for the rugged terrain of Northeast India.

---

## 🌟 Quick Links

- **Handover Guide**: See [HANDOVER_README.md](HANDOVER_README.md) for full developer onboarding, architecture, and deployment instructions.
- **Production Web Application**: [https://landslide-ews.vercel.app](https://landslide-ews.vercel.app)
- **Production Spring Boot API**: [https://ews-backend-gateway-vck8.onrender.com](https://ews-backend-gateway-vck8.onrender.com)
- **GitHub Repository**: [https://github.com/adarshsisodiya2007-web/Ews-demo](https://github.com/adarshsisodiya2007-web/Ews-demo) (Branch: main)

---

## 🏗️ Architecture Overview

1. **Frontend (Web & PWA)**:
   - React 18, Vite, TypeScript, Tailwind CSS
   - Leaflet GIS mapping with dynamic multi-layer susceptibility overlays
   - Service Worker & IndexedDB offline queue for zero-connectivity field reporting
   - Bilingual support (English & Hindi)
2. **Mobile App (Android)**:
   - Native Android wrapper powered by Capacitor 8
   - Offline GIS caching, native Geolocation GPS, Camera integration
   - Tested & buildable with Android Studio / Gradle on Android SDK 34–36
3. **Backend API Gateway**:
   - Spring Boot 3.3.x, Java 21, Spring Security with stateless JWT
   - Flyway database migrations (V1 to V8)
   - Real-time WebSocket (STOMP) alert ticker
   - MinIO / S3 object storage for citizen photo evidence
4. **Database**:
   - PostgreSQL 15/16 + PostGIS 3.4 spatial database extension
5. **AI / ML Microservice**:
   - Python 3.11, FastAPI, XGBoost susceptibility scoring
   - NetworkX Dijkstra algorithm for dynamic safe evacuation routing

---

## ⚡ Quick Start for Developers

### Prerequisites
- Node.js 20+
- Java JDK 21
- Python 3.10+
- Docker Desktop

### 1. Start Database & Object Storage
`ash
docker-compose up -d postgres minio
`

### 2. Run Spring Boot Backend
`ash
cd backend
mvn spring-boot:run
`
*Backend runs at http://localhost:8080. Flyway automatically creates and seeds all database tables.*

### 3. Run Python AI Engine
`ash
cd ai_engine
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1 | Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
python main.py
`
*AI microservice runs at http://localhost:8000 (/docs for Swagger UI).*

### 4. Run Frontend
`ash
cd frontend
npm install
npm run dev
`
*Frontend runs at http://localhost:5173.*

### 5. Run / Build Android App
`ash
cd frontend
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
`
*Open rontend/android in Android Studio or find the built APK at rontend/android/app/build/outputs/apk/debug/app-debug.apk.*

---

## 🔑 Demo Access Credentials

| Portal | URL Route | Credentials | Role / Notes |
|---|---|---|---|
| **Citizen Portal** | /citizen | Any mobile number + OTP 123456 | Incident reports, SOS distress, safe camps |
| **Admin Officer** | /login | dmin / demo1234 | Full command access |
| **District Officer** | /login | kamrup_official / demo1234 | Kamrup sector operations |
| **Shillong Officer** | /login | ekh_official / demo1234 | East Khasi Hills operations |
| **Aizawl Officer** | /login | izawl_officer / demo1234 | Aizawl corridor operations |
| **Responder Portal** | /responder | Direct access or via TopBar | Tactical road status, triage, BLE mesh |

---

## 📜 Full Handover Details
Please refer to **[HANDOVER_README.md](HANDOVER_README.md)** for exhaustive details on:
- Environment variables & security practices
- Cloud deployment configuration (Vercel & Render)
- Scientific methodology and mathematical MCDA weighting
