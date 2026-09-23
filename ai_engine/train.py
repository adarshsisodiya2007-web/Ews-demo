"""
SATARK — Landslide ML Training & Evaluation Pipeline
Trains and rigorously benchmarks:
1. Logistic Regression (Linear baseline)
2. Random Forest (Non-linear bagging ensemble)
3. XGBoost (Gradient Boosted Trees — Primary candidate)

Evaluates on a held-out test set (20%) and generates comparison metrics:
Accuracy, Precision, Recall, F1, ROC-AUC, PR-AUC, Confusion Matrix, and Feature Importances.
Saves model artifacts, metadata, and SHAP explainer validation.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    roc_curve,
    precision_recall_curve
)
import xgboost as xgb
import shap

from dataset import DATASET_PATH, FEATURE_COLUMNS, TARGET_COLUMN

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

def evaluate_model_metrics(model, X_test, y_test, is_pipeline=False, scaler=None):
    """Calculates all key metrics on held-out test data without hardcoding."""
    X_eval = scaler.transform(X_test) if scaler else X_test
    y_pred = model.predict(X_eval)
    
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_eval)[:, 1]
    else:
        y_prob = y_pred

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    pr_auc = float(average_precision_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()

    # ROC curve points (subsampled for compact JSON)
    fpr, tpr, roc_thresh = roc_curve(y_test, y_prob)
    step = max(1, len(fpr) // 25)
    roc_curve_data = [
        {"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)}
        for i in range(0, len(fpr), step)
    ]
    if {"fpr": 1.0, "tpr": 1.0} not in roc_curve_data:
        roc_curve_data.append({"fpr": 1.0, "tpr": 1.0})

    # PR curve points
    precisions, recalls, pr_thresh = precision_recall_curve(y_test, y_prob)
    pr_step = max(1, len(recalls) // 25)
    pr_curve_data = [
        {"recall": round(float(recalls[i]), 4), "precision": round(float(precisions[i]), 4)}
        for i in range(0, len(recalls), pr_step)
    ]

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": cm,
        "roc_curve": roc_curve_data,
        "pr_curve": pr_curve_data
    }

def train_and_benchmark():
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    if not os.path.exists(DATASET_PATH):
        from dataset import build_and_save_dataset
        build_and_save_dataset()

    df = pd.read_csv(DATASET_PATH)
    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()

    # 80/20 Stratified Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Dataset split: Train = {len(X_train)} samples, Test = {len(X_test)} samples")

    # Scaler for linear baseline
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── 1. Logistic Regression Baseline ─────────────────────────────────────
    print("\n--- Training Model 1: Logistic Regression ---")
    log_reg = LogisticRegression(max_iter=1000, random_state=42)
    log_reg.fit(X_train_scaled, y_train)
    metrics_lr = evaluate_model_metrics(log_reg, X_test, y_test, scaler=scaler)
    metrics_lr["model_name"] = "Logistic Regression"
    metrics_lr["type"] = "Linear Baseline"
    print(f"LR: Accuracy={metrics_lr['accuracy']}, F1={metrics_lr['f1_score']}, ROC-AUC={metrics_lr['roc_auc']}")

    # ── 2. Random Forest Baseline ──────────────────────────────────────────
    print("\n--- Training Model 2: Random Forest ---")
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, min_samples_split=4, random_state=42)
    rf.fit(X_train, y_train)
    metrics_rf = evaluate_model_metrics(rf, X_test, y_test)
    metrics_rf["model_name"] = "Random Forest"
    metrics_rf["type"] = "Ensemble Bagging"
    rf_importances = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_COLUMNS, rf.feature_importances_)}
    metrics_rf["feature_importance"] = dict(sorted(rf_importances.items(), key=lambda item: item[1], reverse=True))
    print(f"RF: Accuracy={metrics_rf['accuracy']}, F1={metrics_rf['f1_score']}, ROC-AUC={metrics_rf['roc_auc']}")

    # ── 3. XGBoost Classifier (Primary Candidate) ──────────────────────────
    print("\n--- Training Model 3: XGBoost Classifier ---")
    xgb_model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42
    )
    xgb_model.fit(X_train, y_train)
    metrics_xgb = evaluate_model_metrics(xgb_model, X_test, y_test)
    metrics_xgb["model_name"] = "XGBoost Classifier"
    metrics_xgb["type"] = "Gradient Boosted Trees (Primary)"
    xgb_importances = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_COLUMNS, xgb_model.feature_importances_)}
    metrics_xgb["feature_importance"] = dict(sorted(xgb_importances.items(), key=lambda item: item[1], reverse=True))
    print(f"XGBoost: Accuracy={metrics_xgb['accuracy']}, F1={metrics_xgb['f1_score']}, ROC-AUC={metrics_xgb['roc_auc']}")

    # ── 4. Verify SHAP TreeExplainer on XGBoost ─────────────────────────────
    print("\n--- Initializing & Testing SHAP TreeExplainer ---")
    explainer = shap.TreeExplainer(xgb_model)
    sample_row = X_test.iloc[0:1]
    shap_vals = explainer.shap_values(sample_row)
    print("SHAP TreeExplainer verified! Sample SHAP values shape:", shap_vals.shape)

    # ── 5. Save Artifacts ───────────────────────────────────────────────────
    xgb_model_file = os.path.join(MODELS_DIR, "xgboost_landslide_model.json")
    xgb_model.save_model(xgb_model_file)
    print(f"XGBoost model saved to: {xgb_model_file}")

    feature_names_file = os.path.join(MODELS_DIR, "feature_names.json")
    with open(feature_names_file, "w") as f:
        json.dump(FEATURE_COLUMNS, f, indent=2)

    # Save scaler for potential linear baseline reuse
    scaler_file = os.path.join(MODELS_DIR, "scaler.pkl")
    with open(scaler_file, "wb") as f:
        pickle.dump(scaler, f)

    # Comparison Report
    comparison_table = [
        {
            "Model": "Logistic Regression (Baseline)",
            "Accuracy": metrics_lr["accuracy"],
            "Precision": metrics_lr["precision"],
            "Recall": metrics_lr["recall"],
            "F1-score": metrics_lr["f1_score"],
            "ROC-AUC": metrics_lr["roc_auc"],
            "PR-AUC": metrics_lr["pr_auc"]
        },
        {
            "Model": "Random Forest (Baseline)",
            "Accuracy": metrics_rf["accuracy"],
            "Precision": metrics_rf["precision"],
            "Recall": metrics_rf["recall"],
            "F1-score": metrics_rf["f1_score"],
            "ROC-AUC": metrics_rf["roc_auc"],
            "PR-AUC": metrics_rf["pr_auc"]
        },
        {
            "Model": "XGBoost (Primary)",
            "Accuracy": metrics_xgb["accuracy"],
            "Precision": metrics_xgb["precision"],
            "Recall": metrics_xgb["recall"],
            "F1-score": metrics_xgb["f1_score"],
            "ROC-AUC": metrics_xgb["roc_auc"],
            "PR-AUC": metrics_xgb["pr_auc"]
        }
    ]

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "winning_model": "XGBoost Classifier",
        "comparison_table": comparison_table,
        "models": {
            "logistic_regression": metrics_lr,
            "random_forest": metrics_rf,
            "xgboost": metrics_xgb
        }
    }

    comparison_report_file = os.path.join(MODELS_DIR, "comparison_report.json")
    with open(comparison_report_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Comparison report saved to: {comparison_report_file}")

    metadata = {
        "model_name": "XGBoost Landslide Susceptibility Classifier",
        "version": "v1.0.0",
        "format": "xgboost_json",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "features": FEATURE_COLUMNS,
        "features_count": len(FEATURE_COLUMNS),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "evaluation_metrics": {
            "accuracy": metrics_xgb["accuracy"],
            "precision": metrics_xgb["precision"],
            "recall": metrics_xgb["recall"],
            "f1_score": metrics_xgb["f1_score"],
            "roc_auc": metrics_xgb["roc_auc"],
            "pr_auc": metrics_xgb["pr_auc"],
            "confusion_matrix": metrics_xgb["confusion_matrix"]
        },
        "feature_importance": metrics_xgb["feature_importance"],
        "hyperparameters": {
            "n_estimators": 150,
            "max_depth": 5,
            "learning_rate": 0.08,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "eval_metric": "logloss"
        }
    }

    metadata_file = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Model metadata saved to: {metadata_file}")

    return report

if __name__ == "__main__":
    train_and_benchmark()
