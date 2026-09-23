"""
SATARK Comprehensive Automated Audit & Evidence Collection Script
Covers Sections 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 15, 18
"""
import os
import json
import math
import numpy as np
import pandas as pd
from typing import Dict, Any

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)
from sklearn.cluster import KMeans
import xgboost as xgb
import shap
import httpx

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AI_DIR = os.path.join(BASE_DIR, "ai_engine")
DATASET_PATH = os.path.join(AI_DIR, "data", "landslide_dataset.csv")
MODELS_DIR = os.path.join(AI_DIR, "models")
MODEL_JSON = os.path.join(MODELS_DIR, "xgboost_landslide_model.json")
REPORT_JSON = os.path.join(MODELS_DIR, "comparison_report.json")

def audit_dataset():
    print("=== 1. ML DATASET AUDIT ===")
    assert os.path.exists(DATASET_PATH), f"Dataset not found at {DATASET_PATH}"
    df = pd.read_csv(DATASET_PATH)
    rows, cols = df.shape
    features = [c for c in df.columns if c != "landslide_occurrence"]
    target_counts = df["landslide_occurrence"].value_counts().to_dict()
    missing_vals = df.isnull().sum().to_dict()
    total_missing = sum(missing_vals.values())
    exact_duplicates = df.duplicated().sum()
    coord_duplicates = df.duplicated(subset=["latitude", "longitude"]).sum()
    
    print(f"Total Rows: {rows}")
    print(f"Total Columns: {cols} ({len(features)} features + 1 target)")
    print(f"Target Distribution: {target_counts} (0: {target_counts.get(0, 0)}, 1: {target_counts.get(1, 0)})")
    print(f"Missing Values: {total_missing}")
    print(f"Exact Duplicate Rows: {exact_duplicates}")
    print(f"Coordinate Duplicates: {coord_duplicates}")
    
    return {
        "rows": rows,
        "features_count": len(features),
        "features": features,
        "target_distribution": target_counts,
        "missing_values": total_missing,
        "exact_duplicates": int(exact_duplicates),
        "coord_duplicates": int(coord_duplicates),
        "df": df
    }

def audit_models_and_leakage(df):
    print("\n=== 2 & 3. MODEL TRAINING & DATA LEAKAGE AUDIT ===")
    features = [c for c in df.columns if c != "landslide_occurrence"]
    X = df[features]
    y = df["landslide_occurrence"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Check data leakage: exact overlap between train and test
    train_idx = set(X_train.index)
    test_idx = set(X_test.index)
    overlap_idx = train_idx.intersection(test_idx)
    print(f"Train/Test Index Overlap: {len(overlap_idx)}")
    
    # Pairwise coordinate overlap
    train_coords = set(zip(X_train["latitude"], X_train["longitude"]))
    test_coords = set(zip(X_test["latitude"], X_test["longitude"]))
    coord_overlap = train_coords.intersection(test_coords)
    print(f"Train/Test Exact Coordinate Overlap: {len(coord_overlap)}")
    
    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Logistic Regression
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train_scaled, y_train)
    y_pred_lr = lr.predict(X_test_scaled)
    y_prob_lr = lr.predict_proba(X_test_scaled)[:, 1]
    
    # Train Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, min_samples_split=4, random_state=42)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    
    # Train XGBoost
    xgb_m = xgb.XGBClassifier(
        n_estimators=150, max_depth=5, learning_rate=0.08,
        subsample=0.85, colsample_bytree=0.85, eval_metric="logloss", random_state=42
    )
    xgb_m.fit(X_train, y_train)
    y_pred_xgb = xgb_m.predict(X_test)
    y_prob_xgb = xgb_m.predict_proba(X_test)[:, 1]
    
    # Verify saved model
    loaded_xgb = xgb.XGBClassifier()
    loaded_xgb.load_model(MODEL_JSON)
    y_pred_loaded = loaded_xgb.predict(X_test)
    match_rate = float(np.mean(y_pred_xgb == y_pred_loaded))
    print(f"Saved Model vs Freshly Trained Model Prediction Match: {match_rate*100:.2f}%")
    
    def calc_metrics(y_true, y_pred, y_prob):
        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_true, y_prob)), 4),
            "pr_auc": round(float(average_precision_score(y_true, y_prob)), 4),
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist()
        }
        
    m_lr = calc_metrics(y_test, y_pred_lr, y_prob_lr)
    m_rf = calc_metrics(y_test, y_pred_rf, y_prob_rf)
    m_xgb = calc_metrics(y_test, y_pred_xgb, y_prob_xgb)
    
    print("\n--- Model Benchmark Results (Held-Out Test Set: 300 samples) ---")
    print(f"LR:  Acc={m_lr['accuracy']}, Prec={m_lr['precision']}, Rec={m_lr['recall']}, F1={m_lr['f1']}, ROC-AUC={m_lr['roc_auc']}, PR-AUC={m_lr['pr_auc']}")
    print(f"     CM={m_lr['confusion_matrix']}")
    print(f"RF:  Acc={m_rf['accuracy']}, Prec={m_rf['precision']}, Rec={m_rf['recall']}, F1={m_rf['f1']}, ROC-AUC={m_rf['roc_auc']}, PR-AUC={m_rf['pr_auc']}")
    print(f"     CM={m_rf['confusion_matrix']}")
    print(f"XGB: Acc={m_xgb['accuracy']}, Prec={m_xgb['precision']}, Rec={m_xgb['recall']}, F1={m_xgb['f1']}, ROC-AUC={m_xgb['roc_auc']}, PR-AUC={m_xgb['pr_auc']}")
    print(f"     CM={m_xgb['confusion_matrix']}")
    
    return {
        "lr": m_lr, "rf": m_rf, "xgb": m_xgb,
        "X_train": X_train, "X_test": X_test, "y_train": y_train, "y_test": y_test,
        "xgb_model": xgb_m, "loaded_model": loaded_xgb
    }

def audit_spatial_temporal_validation(df):
    print("\n=== 4. SPATIAL & REGIONAL VALIDATION AUDIT ===")
    features = [c for c in df.columns if c != "landslide_occurrence"]
    X = df[features]
    y = df["landslide_occurrence"]
    
    # Cluster spatial points into 4 geographic clusters (Kamrup/Assam, Meghalaya, Mizoram, Western Ghats)
    coords = df[["latitude", "longitude"]].values
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(coords)
    
    print(f"Spatial Clusters defined: {np.bincount(clusters)}")
    
    # Spatial Leave-One-Cluster-Out (Spatial Cross-Validation)
    spatial_accuracies = []
    spatial_f1s = []
    spatial_aucs = []
    
    for c in range(4):
        test_mask = (clusters == c)
        train_mask = ~test_mask
        
        X_tr, y_tr = X[train_mask], y[train_mask]
        X_te, y_te = X[test_mask], y[test_mask]
        
        m = xgb.XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.08,
            subsample=0.85, colsample_bytree=0.85, eval_metric="logloss", random_state=42
        )
        m.fit(X_tr, y_tr)
        preds = m.predict(X_te)
        probs = m.predict_proba(X_te)[:, 1]
        
        acc = accuracy_score(y_te, preds)
        f1 = f1_score(y_te, preds, zero_division=0)
        try:
            auc = roc_auc_score(y_te, probs)
        except:
            auc = 0.5
        spatial_accuracies.append(acc)
        spatial_f1s.append(f1)
        spatial_aucs.append(auc)
        print(f"Spatial Fold {c+1} (Region Cluster {c}): Acc={acc:.4f}, F1={f1:.4f}, ROC-AUC={auc:.4f} (Test size: {len(y_te)})")
        
    mean_spatial_acc = float(np.mean(spatial_accuracies))
    mean_spatial_f1 = float(np.mean(spatial_f1s))
    mean_spatial_auc = float(np.mean(spatial_aucs))
    print(f"--> Mean Spatial Cross-Validation: Acc={mean_spatial_acc:.4f}, F1={mean_spatial_f1:.4f}, ROC-AUC={mean_spatial_auc:.4f}")
    
    return {
        "spatial_accuracies": spatial_accuracies,
        "mean_spatial_acc": mean_spatial_acc,
        "mean_spatial_f1": mean_spatial_f1,
        "mean_spatial_auc": mean_spatial_auc
    }

def audit_api_endpoints():
    print("\n=== 5, 6, 7, 8, 11, 14, 15, 18. API & INFERENCE AUDIT ===")
    base_url = "http://127.0.0.1:8000"
    results = {}
    
    with httpx.Client(base_url=base_url, timeout=15.0) as client:
        # 1. Health
        r_health = client.get("/health")
        print(f"/health -> {r_health.status_code}, {r_health.json()}")
        results["health"] = {"status": r_health.status_code, "body": r_health.json()}
        
        # 2. Model Info
        r_model = client.get("/model-info")
        print(f"/model-info -> {r_model.status_code}")
        results["model_info"] = {"status": r_model.status_code, "body": r_model.json()}
        
        # 3. Predict Risk: LOW, MEDIUM, HIGH, CRITICAL
        test_cases = [
            ("LOW", {"latitude": 26.1, "longitude": 91.7, "slope": 8.0, "rainfall_24h": 5.0, "rainfall_72h": 10.0, "soil_moisture": 0.15}),
            ("MODERATE", {"latitude": 26.1, "longitude": 91.7, "slope": 22.0, "rainfall_24h": 45.0, "rainfall_72h": 90.0, "soil_moisture": 0.45}),
            ("HIGH", {"latitude": 25.5, "longitude": 91.8, "slope": 32.0, "rainfall_24h": 110.0, "rainfall_72h": 220.0, "soil_moisture": 0.72}),
            ("CRITICAL", {"latitude": 25.5, "longitude": 91.8, "slope": 42.0, "rainfall_24h": 220.0, "rainfall_72h": 400.0, "soil_moisture": 0.95})
        ]
        
        pred_results = {}
        for level, payload in test_cases:
            r_pred = client.post("/predict-risk", json=payload)
            data = r_pred.json()
            pred_results[level] = {
                "status": r_pred.status_code,
                "probability": data.get("risk_probability"),
                "level": data.get("risk_level"),
                "shap_top": data.get("top_contributing_features", [{}])[0]
            }
            print(f"Predict [{level}] -> Status: {r_pred.status_code}, Prob: {data.get('risk_probability')}, Level: {data.get('risk_level')}, SHAP: {data.get('top_contributing_features', [{}])[0]}")
        results["predict_tests"] = pred_results
        
        # 4. Input validation (Invalid & Missing)
        # Invalid type
        r_inv = client.post("/predict-risk", json={"slope": "invalid_string_slope"})
        print(f"Invalid input test (string slope) -> {r_inv.status_code}")
        results["invalid_input"] = r_inv.status_code
        
        # Missing fields (should use defaults or return 422 if required)
        r_empty = client.post("/predict-risk", json={})
        print(f"Empty input test -> {r_empty.status_code}, Risk Level: {r_empty.json().get('risk_level')}")
        results["empty_input"] = {"status": r_empty.status_code, "level": r_empty.json().get("risk_level")}
        
        # Extreme input (Slope 89 deg, Rain 900mm)
        r_extreme = client.post("/predict-risk", json={"slope": 89.0, "rainfall_24h": 900.0, "soil_moisture": 1.0})
        print(f"Extreme input test -> {r_extreme.status_code}, Prob: {r_extreme.json().get('risk_probability')}, Level: {r_extreme.json().get('risk_level')}")
        results["extreme_input"] = {"status": r_extreme.status_code, "level": r_extreme.json().get("risk_level")}
        
        # 5. SHAP Explainer verification
        # Compare SHAP values between low rain (5mm) and high rain (250mm)
        p_low = client.post("/predict-risk", json={"slope": 30.0, "rainfall_24h": 5.0, "soil_moisture": 0.20}).json()
        p_high = client.post("/predict-risk", json={"slope": 30.0, "rainfall_24h": 250.0, "soil_moisture": 0.90}).json()
        shap_low_rain = p_low.get("shap_values", {}).get("rainfall_24h", 0)
        shap_high_rain = p_high.get("shap_values", {}).get("rainfall_24h", 0)
        print(f"SHAP rainfall_24h: Low Rain ({shap_low_rain}) vs High Rain ({shap_high_rain})")
        results["shap_diff"] = {"low_rain_shap": shap_low_rain, "high_rain_shap": shap_high_rain}
        
        # 6. Multi-Horizon Forecast
        r_fc = client.get("/api/v1/risk-forecast?lat=25.5788&lon=91.8933&slope=35.0")
        d_fc = r_fc.json()
        print(f"Forecast -> {r_fc.status_code}, Trend: {d_fc.get('risk_trend')}, Source: {d_fc.get('forecast_source')}")
        results["forecast"] = {"status": r_fc.status_code, "trend": d_fc.get("risk_trend"), "source": d_fc.get("forecast_source")}
        
        # 7. Simulation Workbench
        sim_payload = {
            "baseline_lat": 25.5788, "baseline_lon": 91.8933, "baseline_slope": 30.0,
            "baseline_rain_24h": 30.0, "baseline_soil_moisture": 0.30,
            "simulated_slope": 45.0, "simulated_rain_24h": 190.0, "simulated_soil_moisture": 0.85
        }
        r_sim = client.post("/api/v1/simulate-risk", json=sim_payload)
        d_sim = r_sim.json()
        print(f"Simulation -> {r_sim.status_code}, Base={d_sim['baseline']['risk_score']} -> Sim={d_sim['simulated']['risk_score']}, Delta={d_sim['risk_delta']}, Disclaimer={d_sim['disclaimer']}")
        results["simulation"] = {
            "status": r_sim.status_code,
            "is_simulation": d_sim.get("is_simulation"),
            "disclaimer": d_sim.get("disclaimer"),
            "risk_delta": d_sim.get("risk_delta")
        }
        
        # 8. Sensor Ingestion
        sensor_payload = {
            "sensor_id": "SN-AUDIT-TEST-01",
            "latitude": 25.5788,
            "longitude": 91.8933,
            "soil_moisture": 0.65,
            "rainfall_rate_mm_h": 22.0,
            "tilt_deg": 2.4,
            "vibration_g": 0.08,
            "battery_pct": 94.0,
            "is_demo": True
        }
        r_sens_post = client.post("/api/v1/sensor-data", json=sensor_payload)
        r_sens_get = client.get("/api/v1/sensor-data/recent")
        d_sens_get = r_sens_get.json()
        found_in_recent = any(s.get("sensor_id") == "SN-AUDIT-TEST-01" for s in d_sens_get.get("readings", []))
        print(f"Sensor POST -> {r_sens_post.status_code}, GET recent count: {d_sens_get.get('count')}, Found ingested sensor: {found_in_recent}")
        results["sensor"] = {"post_status": r_sens_post.status_code, "get_status": r_sens_get.status_code, "found": found_in_recent}
        
        # 9. NetworkX Routing Fallback
        r_route = client.get("/api/v1/risk-assessment?lat=25.5788&lon=91.8933&slope=40.0")
        d_route = r_route.json()
        evac = d_route.get("evacuation_plan", {})
        print(f"Routing -> Status: {evac.get('status')}, Primary: {evac.get('primary_corridor')}, Safe Detour: {evac.get('safe_evacuation_route')}")
        results["routing"] = evac
        
    return results

if __name__ == "__main__":
    d_res = audit_dataset()
    m_res = audit_models_and_leakage(d_res["df"])
    s_res = audit_spatial_temporal_validation(d_res["df"])
    a_res = audit_api_endpoints()
    
    # Save audit facts to json for report generation
    audit_summary = {
        "dataset": {
            "rows": d_res["rows"],
            "features_count": d_res["features_count"],
            "features": d_res["features"],
            "target_distribution": d_res["target_distribution"],
            "missing_values": d_res["missing_values"],
            "exact_duplicates": d_res["exact_duplicates"],
            "coord_duplicates": d_res["coord_duplicates"]
        },
        "models": {
            "lr": m_res["lr"],
            "rf": m_res["rf"],
            "xgb": m_res["xgb"]
        },
        "spatial_cv": s_res,
        "api": a_res
    }
    with open(os.path.join(BASE_DIR, "audit_raw_evidence.json"), "w") as f:
        json.dump(audit_summary, f, indent=2)
    print("\n[SUCCESS] Raw audit evidence saved to audit_raw_evidence.json")
