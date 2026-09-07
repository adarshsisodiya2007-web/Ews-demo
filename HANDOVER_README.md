# 🛰️ SATARK — AI Landslide Early Warning System (NER)
### SIH 26001 · Complete Project Handover & Developer Guide

Welcome to the **SATARK** (System for Alert, Tracking, Analysis & Landslide Risk in Northeast Region) codebase. This repository contains the complete end-to-end mission-critical disaster management platform:
1. **Frontend (Web & PWA)**: React 18, Vite, TypeScript, Leaflet GIS, Tailwind CSS, Offline IndexedDB Sync, Service Worker.
2. **Mobile App (Android)**: Native Android shell wrapped via Capacitor 8 with offline caching, GPS geofencing, and camera integration.
3. **Backend Gateway**: Spring Boot 3.3, Java 21, Spring Security (JWT), Spring Data JPA, Flyway (V1–V8), WebSocket (STOMP).
4. **Database**: PostgreSQL 15/16 with PostGIS 3.4 spatial extensions.
5. **AI/ML Microservice**: Python 3.11, FastAPI, XGBoost terrain susceptibility scoring, NetworkX evacuation graph routing.
6. **DevOps & Cloud**: Docker Compose, Vercel (Frontend), Render (Spring Boot & Managed PostgreSQL).

---

## 📌 Repository & Production Information

- **GitHub Repository**: https://github.com/adarshsisodiya2007-web/Ews-demo.git
- **Main Branch**: main
- **Live Production Web App**: https://landslide-ews.vercel.app
- **Live Production Backend API**: https://ews-backend-gateway-vck8.onrender.com
- **Backend Health Check**: https://ews-backend-gateway-vck8.onrender.com/actuator/health

---

## 📁 Complete Project Structure

`
Ews-demo/
├── .env.example                        # Root environment variables template (Docker & backend)
├── docker-compose.yml                  # Local development multi-container orchestration
├── render.yaml                         # Production Infrastructure as Code (Render blueprint)
├── README.md                           # Quick-start summary
├── HANDOVER_README.md                  # Comprehensive handover guide (this document)
├── RESEARCH_PAPER_DOCUMENTATION.md     # Technical scientific documentation & MCDA model
├── SYSTEM_FUNCTIONS_AND_FEATURES_GUIDE.md # Exhaustive feature breakdown
│
├── frontend/                           # React + Vite + Capacitor Frontend Application
│   ├── .env.example                    # Frontend environment template
│   ├── .env.production                 # Production Vercel environment config
│   ├── capacitor.config.ts             # Capacitor Android configuration
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── tsconfig.json                   # TypeScript compiler options
│   ├── vite.config.ts                  # Vite build tool and PWA plugin config
│   ├── vercel.json                     # Vercel SPA routing & security headers
│   ├── public/                         # Static assets, sound alerts, demo images, PWA icons
│   ├── src/
│   │   ├── components/                 # UI components (GIS Map, Heatmap, TopBar, AI Priority, etc.)
│   │   │   ├── alerts/                 # Emergency alert banners & sound players
│   │   │   ├── emergency/              # Offline rescue beacon, BLE mesh simulator
│   │   │   ├── layout/                 # TopBar, Navigation, Offline status indicators
│   │   │   ├── map/                    # Leaflet GIS interactive map, layer toggles
│   │   │   ├── panels/                 # Region details, shelter locations, offline queue
│   │   │   └── responder/              # Tactical dispatch, detour protocol, BLE rescue scanner
│   │   ├── hooks/                      # Custom hooks (useOfflineSync, useGeolocation, etc.)
│   │   ├── pages/                      # Application route pages
│   │   │   ├── CitizenPortal.tsx       # Public citizen report submission, alerts, safe shelters
│   │   │   ├── OfficialDashboard.tsx   # Officer command center, terrain risk, AI priority panel
│   │   │   ├── ResponderPortal.tsx     # Tactical responder view, road blockades, field SOS triage
│   │   │   ├── LoginPage.tsx           # Officer & Admin secure login
│   │   │   ├── SIHDashboard.tsx        # High-level GIS analytics dashboard
│   │   │   ├── OfflineRescuePage.tsx   # Zero-connectivity mesh and emergency guide
│   │   │   └── ReportFormPage.tsx      # Multi-step ground hazard report form
│   │   ├── services/                   # API clients, IndexedDB offline stores, AI priority agent
│   │   └── types/                      # TypeScript definitions (Region, Report, User, Alert, etc.)
│   └── android/                        # Native Android Capacitor Project
│       ├── build.gradle                # Top-level Gradle build file
│       ├── gradle.properties           # Android build & JVM memory configuration
│       ├── gradlew / gradlew.bat       # Gradle wrappers
│       ├── settings.gradle             # Android modules and Capacitor plugins include
│       └── app/                        # Android application module
│           ├── build.gradle            # App-level SDK versions, dependencies, build types
│           └── src/main/
│               ├── AndroidManifest.xml # Permissions (GPS, Camera, Internet, Storage)
│               ├── java/               # Native MainActivity Java source
│               ├── res/                # App launcher icons, splash screen, strings, styles
│               └── assets/             # Capacitor config and bundled web distribution
│
├── backend/                            # Spring Boot 3.3 Backend API Gateway
│   ├── pom.xml                         # Maven dependencies & build plugins
│   ├── Dockerfile                      # Multi-stage Dockerfile (Temurin 21 JDK -> JRE)
│   └── src/
│       ├── main/
│       │   ├── java/com/ews/ner/
│       │   │   ├── config/             # SecurityConfig, CorsConfig, WebSocketConfig, MinioConfig
│       │   │   ├── controller/         # REST Controllers (Auth, Reports, Risk, Alerts, Citizen)
│       │   │   ├── dto/                # Request / Response Data Transfer Objects
│       │   │   ├── entity/             # JPA Entities (AppUser, RegionRisk, CitizenReport, etc.)
│       │   │   ├── repository/         # Spring Data JPA Repositories
│       │   │   ├── security/           # JWT Provider, Auth Filter, UserDetailsService
│       │   │   ├── service/            # Core business logic (RiskEngine, ReportService, OtpService)
│       │   │   └── EarlyWarningApplication.java # Spring Boot main entrypoint
│       │   └── resources/
│       │       ├── application.yml     # Application configuration & profiles
│       │       └── db/migration/       # Flyway database migration scripts (V1 through V8)
│       └── test/                       # Unit & integration test suites
│
└── ai_engine/                          # Python AI Landslide Risk & Routing Microservice
    ├── Dockerfile                      # Python 3.11 container definition
    ├── requirements.txt                # Python libraries (FastAPI, Uvicorn, NumPy, NetworkX)
    └── main.py                         # FastAPI server with XGBoost model & evacuation routing
`

---

## 🛠️ Required Software & Versions

| Component | Recommended Version | Download Link / Notes |
|---|---|---|
| **Node.js** | 20.x or 22.x (LTS) | [nodejs.org](https://nodejs.org/) (npm 9+) |
| **Java JDK** | Java 21 (Temurin / OpenJDK) | [adoptium.net](https://adoptium.net/) (Set JAVA_HOME) |
| **Maven** | 3.9+ | [maven.apache.org](https://maven.apache.org/) (or use IDE bundled Maven) |
| **Python** | 3.10 or 3.11 | [python.org](https://python.org/) |
| **Android Studio** | Ladybug (2024.2+) or Koala | [developer.android.com/studio](https://developer.android.com/studio) |
| **Android SDK** | SDK Platforms 34 to 36 | Installed via Android Studio SDK Manager |
| **Docker Desktop** | 24+ | [docker.com](https://www.docker.com/) |
| **PostgreSQL** | 15 or 16 with PostGIS 3.4 | Included in Docker, or native installer |

---

## 🚀 Step-by-Step Setup & Running Guide

### 1. Database Setup (PostgreSQL + PostGIS)

#### Option A: Run via Docker (Fastest & Recommended for Local Dev)
Run only the database and MinIO storage container:
`ash
docker-compose up -d postgres minio
`
- PostgreSQL will be live on localhost:5432 with database ews_ner, user ews_user, password ews_secure_pass.
- MinIO S3 Console will be on http://localhost:9001 (ews_minio_user / ews_minio_pass).

#### Option B: Native PostgreSQL
If you already have PostgreSQL installed locally:
1. Open psql or pgAdmin as superuser:
   `sql
   CREATE DATABASE ews_ner;
   \c ews_ner
   CREATE EXTENSION IF NOT EXISTS postgis;
   `
2. Update your credentials in .env or ackend/src/main/resources/application.yml.

> **Note on Migrations**: You do NOT need to manually run SQL scripts. Spring Boot will automatically run Flyway migrations V1 to V8 when it boots up.

---

### 2. Running the Spring Boot Backend

1. Navigate to the backend directory:
   `ash
   cd backend
   `
2. Build and run:
   `ash
   mvn spring-boot:run
   `
   *(Or open ackend as a Maven project in IntelliJ IDEA / Eclipse and run EarlyWarningApplication.java)*
3. Check that the service is running:
   - Endpoint: http://localhost:8080/actuator/health
   - Should return: {"status":"UP", ...}

---

### 3. Running the Python AI Engine

1. Navigate to the i_engine folder:
   `ash
   cd ai_engine
   `
2. Create and activate a virtual environment:
   `ash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   `
3. Install dependencies:
   `ash
   pip install -r requirements.txt
   `
4. Run the FastAPI microservice:
   `ash
   python main.py
   # OR:
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   `
5. Interactive OpenAPI Swagger documentation will be available at:
   - http://localhost:8000/docs

---

### 4. Running the Frontend (React / Vite)

1. Navigate to the frontend directory:
   `ash
   cd frontend
   `
2. Install npm packages:
   `ash
   npm install
   `
3. Create your local environment file:
   `ash
   cp .env.example .env
   `
   Ensure VITE_API_BASE_URL is set:
   - For local development: VITE_API_BASE_URL=http://localhost:8080
   - For cloud backend: VITE_API_BASE_URL=https://ews-backend-gateway-vck8.onrender.com
4. Start the Vite dev server:
   `ash
   npm run dev
   `
5. Open your browser at:
   - http://localhost:5173

---

### 5. Running the Android Application in Android Studio

1. Make sure you have built the web assets first:
   `ash
   cd frontend
   npm run build
   npx cap sync android
   `
2. Open Android Studio:
   - Click **File > Open...**
   - Select the directory: rontend/android
3. Wait for Gradle sync to complete. Android Studio will download the Android Gradle Plugin and dependencies.
4. Connect an Android phone with USB Debugging enabled, or launch an Android Virtual Device (AVD Emulator).
5. Click the green **Run (Shift+F10)** button.
6. The app will launch with full access to camera, GPS location, and offline persistence.

---

### 6. Building the Android APK from Command Line

To build the APK without opening Android Studio:
`powershell
cd frontend
npm run build
npx cap sync android

cd android
# Ensure JAVA_HOME points to your JDK 21 installation:
 = "C:\Users\<YourUser>\.jdks\jbr-21.0.11"   # Example path
.\gradlew.bat assembleDebug
`

The output APK will be generated at:
`
frontend/android/app/build/outputs/apk/debug/app-debug.apk
`

---

## 🔑 Demo Accounts & Login Credentials

All demo accounts come pre-configured in Flyway migration V7 and V8:

### 1. Citizen Portal (/citizen)
- **Login Flow**: Mobile OTP Authentication.
- **Phone Number**: Any 10-digit mobile number (e.g. 9876543210).
- **Demo OTP Code**: 123456 *(Works immediately in demo mode with no external SMS gateway required)*.
- **Features Available**: Incident report submission with photo evidence, SOS Distress Beacon, Safe Camp navigator, Offline rescue mesh.

### 2. Officer & Admin Portal (/login)
- **Admin**:
  - Username: dmin
  - Password: demo1234
  - Role: ROLE_ADMIN
- **Kamrup District Officer**:
  - Username: kamrup_official
  - Password: demo1234
  - Role: ROLE_OFFICIAL
- **East Khasi Hills (Shillong) Officer**:
  - Username: ekh_official
  - Password: demo1234
  - Role: ROLE_OFFICIAL
- **Aizawl District Officer**:
  - Username: izawl_officer
  - Password: demo1234
  - Role: ROLE_OFFICIAL

### 3. Responder Portal (/responder)
- Accessible directly or via the Officer Dashboard navigation button.
- **Features Available**: Tactical detours, road corridor status toggles (OPEN / AT_RISK / BLOCKED), BLE rescue scanner, GPS triage.

---

## 🌐 Production Cloud Architecture

### Vercel (Frontend Hosting)
- **Repo Connection**: Automatically builds from main branch.
- **Root Directory**: rontend
- **Build Command**: 
pm run build
- **Output Directory**: dist
- **Environment Variable**:
  - VITE_API_BASE_URL = https://ews-backend-gateway-vck8.onrender.com

### Render (Spring Boot & PostgreSQL Hosting)
- **Web Service**: Runs ackend/Dockerfile as a containerized service.
- **Environment Variables configured on Render**:
  - SPRING_DATASOURCE_URL = jdbc:postgresql://<render-db-hostname>:5432/ews_ner
  - SPRING_DATASOURCE_USERNAME = <render-db-user>
  - SPRING_DATASOURCE_PASSWORD = <render-db-password>
  - APP_JWT_SECRET = <production-256bit-secret>
  - APP_OTP_DEMO_MODE = 	rue (or alse when connecting Twilio)

---

## 🔒 Security & Environment Variables Reference

| Environment Variable | Description | Default / Example | Secret? |
|---|---|---|:---:|
| SPRING_DATASOURCE_URL | PostgreSQL JDBC connection URL | jdbc:postgresql://localhost:5432/ews_ner | Yes (in prod) |
| SPRING_DATASOURCE_USERNAME | Database username | ews_user | No |
| SPRING_DATASOURCE_PASSWORD | Database password | ews_secure_pass | **YES** |
| APP_JWT_SECRET | 256-bit secret key used to sign session tokens | ews-ner-sih26001-jwt-demo-secret-key-2026-hackathon | **YES** |
| APP_JWT_EXPIRY_MS | JWT token validity in milliseconds | 86400000 (24 hours) | No |
| APP_OTP_DEMO_MODE | Enable instant demo OTP code without SMS cost | 	rue | No |
| APP_OTP_DEMO_CODE | Code accepted in demo mode | 123456 | No |
| APP_MINIO_ENDPOINT | S3/MinIO endpoint URL | http://localhost:9000 | No |
| APP_MINIO_ACCESS_KEY | S3 object storage access key | ews_minio_user | No |
| APP_MINIO_SECRET_KEY | S3 object storage secret key | ews_minio_pass | **YES** |
| TWILIO_ACCOUNT_SID | Twilio Account SID for live SMS alerts | *(empty / DEMO)* | **YES** |
| TWILIO_AUTH_TOKEN | Twilio Auth Token for live SMS alerts | *(empty / DEMO)* | **YES** |
| VITE_API_BASE_URL | API Gateway URL called by the React frontend | http://localhost:8080 (dev) / Render URL (prod) | No |

---

## 🔄 First Steps for the New Developer

1. **Unzip** the handover package into any directory.
2. **Install Node.js 20+** and **Java 21 JDK**.
3. Run 
pm install inside rontend/.
4. Start local Docker containers: docker-compose up -d postgres minio.
5. Run backend: cd backend && mvn spring-boot:run.
6. Run frontend: cd frontend && npm run dev.
7. Test the app at http://localhost:5173.
8. To run on Android: open rontend/android in Android Studio and run.

*All source code, GIS assets, demo database seeds, responsive fixes, and documentation are preserved in full working condition.*
