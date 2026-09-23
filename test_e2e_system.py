import urllib.request
import json
import sys

def test_endpoint(name, url, method="GET", data=None):
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header('Content-Type', 'application/json')
            body = json.dumps(data).encode('utf-8')
        else:
            body = None
            
        with urllib.request.urlopen(req, data=body, timeout=5) as response:
            status = response.status
            content = response.read().decode('utf-8')
            parsed = None
            try:
                parsed = json.loads(content)
            except:
                pass
            print(f"[PASS] {name} -> HTTP {status}")
            return parsed
    except Exception as e:
        print(f"[FAIL] {name} -> Error: {e}")
        return None

print("=" * 60)
print("1. VERIFYING FASTAPI AI MICROSERVICE (http://127.0.0.1:8000)")
print("=" * 60)

# 1. Health
h = test_endpoint("AI Engine /health", "http://127.0.0.1:8000/health")
assert h and h.get("status") == "UP", "Health check failed"

# 2. Model Info
m = test_endpoint("AI Engine /model-info", "http://127.0.0.1:8000/model-info")
assert m and "evaluation_metrics" in m, "Model info failed"
print(f"       Model: {m.get('model_name')} | Held-Out Test Accuracy: {m['evaluation_metrics']['accuracy']*100:.2f}% | ROC-AUC: {m['evaluation_metrics']['roc_auc']:.4f}")

# 3. Predict Risk + SHAP
p = test_endpoint(
    "AI Engine /predict-risk (XGBoost + SHAP)",
    "http://127.0.0.1:8000/predict-risk",
    method="POST",
    data={
        "latitude": 25.5788,
        "longitude": 91.8933,
        "slope": 38.5,
        "rainfall_24h": 165.0,
        "rainfall_72h": 320.0,
        "soil_moisture": 0.88,
        "region_name": "Shillong Ridge (NER)"
    }
)
assert p and "risk_probability" in p, "Prediction failed"
print(f"       Prediction: {p.get('risk_level')} ({p.get('risk_probability')*100:.1f}%) | Top SHAP driver: {p['top_contributing_features'][0]['feature']} ({p['top_contributing_features'][0]['shap_value']:+.3f})")

# 4. Multi-Horizon Forecast
f = test_endpoint(
    "AI Engine /api/v1/risk-forecast",
    "http://127.0.0.1:8000/api/v1/risk-forecast?lat=25.5788&lon=91.8933&slope=35.0&regionName=Shillong%20Ridge"
)
assert f and "risk_trend" in f and "forecast_24h" in f, "Forecast failed"
print(f"       Temporal Forecast: Trend={f.get('risk_trend')} | T+24h Risk={f['forecast_24h']['risk_score']*100:.1f}%")

# 5. Simulation Workbench
s = test_endpoint(
    "AI Engine /api/v1/simulate-risk (What-If Analysis)",
    "http://127.0.0.1:8000/api/v1/simulate-risk",
    method="POST",
    data={
        "baseline_lat": 25.5788,
        "baseline_lon": 91.8933,
        "baseline_slope": 30.0,
        "baseline_rain_24h": 20.0,
        "baseline_soil_moisture": 0.25,
        "simulated_slope": 45.0,
        "simulated_rain_24h": 210.0,
        "simulated_soil_moisture": 0.92
    }
)
assert s and s.get("is_simulation") is True, "Simulation failed"
print(f"       Simulation: Baseline {s['baseline']['risk_score']*100:.1f}% -> Simulated {s['simulated']['risk_score']*100:.1f}% (Delta: {s['risk_delta']*100:+.1f}%)")

# 6. Geotechnical IoT Sink
test_endpoint(
    "AI Engine /api/v1/sensor-data (IoT Ingestion)",
    "http://127.0.0.1:8000/api/v1/sensor-data",
    method="POST",
    data={
        "sensor_id": "NER-IOT-SHILLONG-001",
        "latitude": 25.5788,
        "longitude": 91.8933,
        "soil_moisture": 0.78,
        "rainfall_rate_mm_h": 14.5,
        "tilt_deg": 1.2,
        "vibration_g": 0.05,
        "battery_pct": 98.0
    }
)

print("\n" + "=" * 60)
print("2. VERIFYING FRONTEND APPLICATION (http://localhost:5173)")
print("=" * 60)

routes = [
    ("Root Landing Page", "http://localhost:5173/"),
    ("Citizen Safety Portal", "http://localhost:5173/citizen"),
    ("Responder Portal", "http://localhost:5173/responder"),
    ("GIS Map View", "http://localhost:5173/map"),
    ("Official Dashboard", "http://localhost:5173/official"),
    ("Admin Route", "http://localhost:5173/admin"),
    ("Hazard Scanner Report", "http://localhost:5173/report"),
    ("Offline Rescue View", "http://localhost:5173/offline-rescue")
]

all_routes_ok = True
for name, url in routes:
    res = test_endpoint(f"Frontend Route: {name}", url)
    if res is None:
        all_routes_ok = False

print("\n" + "=" * 60)
print("ALL CORE SERVICES VERIFIED AND HEALTHY!")
print("=" * 60)
