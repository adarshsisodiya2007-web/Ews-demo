"""
Unit & Integration Test Suite for SATARK AI Engine
Tests:
1. Health & Model Info
2. Trained XGBoost POST /predict-risk with SHAP feature explanations
3. Multi-horizon risk forecasting (/api/v1/risk-forecast)
4. Simulation workbench (/api/v1/simulate-risk)
5. IoT Sensor Data ingestion (/api/v1/sensor-data)
6. Backward compatibility (/api/v1/risk-assessment)
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_and_model_info():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["artifacts_loaded"] is True
    print("[PASS] /health passed:", data["models"])

    res = client.get("/model-info")
    assert res.status_code == 200
    info = res.json()
    assert info["model_name"] == "XGBoost Landslide Susceptibility Classifier"
    assert info["version"] == "v1.0.0"
    assert "evaluation_metrics" in info
    assert info["evaluation_metrics"]["accuracy"] > 0.75
    print("[PASS] /model-info passed: Accuracy =", info["evaluation_metrics"]["accuracy"], "F1 =", info["evaluation_metrics"]["f1_score"])

def test_predict_risk_with_shap():
    payload = {
        "latitude": 25.5788,
        "longitude": 91.8933,
        "slope": 38.5,
        "rainfall_24h": 165.0,
        "rainfall_72h": 320.0,
        "soil_moisture": 0.88,
        "region_name": "Shillong Ridge (NER)"
    }
    res = client.post("/predict-risk", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "risk_probability" in data
    assert "top_contributing_features" in data
    assert len(data["top_contributing_features"]) > 0
    assert data["model_version"] == "v1.0.0"
    assert data["prediction_status"] == "VALIDATED_ML_PREDICTION"
    print("[PASS] /predict-risk passed: Probability =", data["risk_probability"], "Level =", data["risk_level"])
    print("  Top SHAP driver:", data["top_contributing_features"][0]["explanation"])

def test_multi_horizon_forecast():
    res = client.get("/api/v1/risk-forecast?lat=25.5788&lon=91.8933&slope=35.0&regionName=Shillong%20Ridge")
    assert res.status_code == 200
    data = res.json()
    assert "current_risk" in data
    assert "forecast_6h" in data
    assert "forecast_12h" in data
    assert "forecast_24h" in data
    assert "forecast_48h" in data
    assert "risk_trend" in data
    print("[PASS] /api/v1/risk-forecast passed: Trend =", data["risk_trend"], "T+24h Risk =", data["forecast_24h"]["risk_score"])

def test_simulation_workbench():
    payload = {
        "baseline_lat": 11.5513,
        "baseline_lon": 76.1264,
        "baseline_slope": 30.0,
        "baseline_rain_24h": 20.0,
        "baseline_soil_moisture": 0.25,
        "simulated_slope": 45.0,
        "simulated_rain_24h": 210.0,
        "simulated_soil_moisture": 0.92
    }
    res = client.post("/api/v1/simulate-risk", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_simulation"] is True
    assert data["disclaimer"] == "SIMULATION — NOT A LIVE PREDICTION"
    assert data["simulated"]["risk_score"] > data["baseline"]["risk_score"]
    print("[PASS] /api/v1/simulate-risk passed: Baseline =", data["baseline"]["risk_score"], "-> Simulated =", data["simulated"]["risk_score"])

def test_sensor_ingestion():
    payload = {
        "sensor_id": "NER-IOT-SHILLONG-001",
        "latitude": 25.5788,
        "longitude": 91.8933,
        "soil_moisture": 0.76,
        "rainfall_rate_mm_h": 18.5,
        "tilt_deg": 1.8,
        "is_demo": True
    }
    res = client.post("/api/v1/sensor-data", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INGESTED"

    res2 = client.get("/api/v1/sensor-data/recent")
    assert res2.status_code == 200
    assert res2.json()["count"] >= 1
    print("[PASS] /api/v1/sensor-data passed: Sensor telemetry ingested and queried successfully.")

def test_backward_compatibility():
    res = client.get("/api/v1/risk-assessment?lat=11.5513&lon=76.1264&slope=38.5&regionName=Meppadi")
    assert res.status_code == 200
    data = res.json()
    assert "assessment" in data
    assert "evacuation_plan" in data
    print("[PASS] /api/v1/risk-assessment passed: Backward-compatible structure maintained.")

if __name__ == "__main__":
    test_health_and_model_info()
    test_predict_risk_with_shap()
    test_multi_horizon_forecast()
    test_simulation_workbench()
    test_sensor_ingestion()
    test_backward_compatibility()
    print("\n================ ALL AI ENGINE TESTS PASSED ================\n")
