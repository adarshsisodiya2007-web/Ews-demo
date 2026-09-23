# 🧠 SATARK AI/ML & Early Warning Engine Documentation

## 1. Problem Statement
Landslides in the Northeast Region (NER) of India cause devastating loss of life, sever national arterial highways (such as NH-6, NH-27, NH-306, and NH-766), and isolate communities during intense monsoon rainfalls. This system replaces legacy subjective estimations with an integrated machine learning, SHAP explainable AI, multi-horizon meteorological forecasting, and graph-theoretic safe evacuation platform.

---

## 2. End-to-End System Architecture

```
                                  ┌─────────────────────────────┐
                                  │   Environmental & GIS Data  │
                                  │   (Open-Meteo, NASA DEM,    │
                                  │    GSI Bhooskhalan Records, │
                                  │    IoT Tilt/Moisture Feeds) │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │ 19-Feature Scientific Data  │
                                  │ Pipeline & Validation Engine│
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │  XGBoost Landslide Engine   │
                                  │   (Trained on 1,500 Samples │
                                  │    Held-out Test Evaluated) │
                                  └──────┬───────────────┬──────┘
                                         │               │
                         ┌───────────────┘               └──────────────┐
                         ▼                                              ▼
          ┌─────────────────────────────┐                ┌─────────────────────────────┐
          │     SHAP TreeExplainer      │                │ Multi-Horizon Risk Forecast │
          │  Local Attribution & Drivers│                │  (T+0, +6h, +12h, +24h, +48h│
          └──────────────┬──────────────┘                └──────────────┬──────────────┘
                         │                                              │
                         └───────────────────────┬──────────────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │     SATARK Command Core     │
                                  │   • Dynamic Rerouting       │
                                  │   • Shelter Intelligence    │
                                  │   • Impact Analysis         │
                                  │   • Offline IndexedDB Queue │
                                  └─────────────────────────────┘
```

---

## 3. Data Sources & Benchmark Schema

### Dataset Provenance & Categorization
- **Dataset Type**: **SYNTHETIC (Anchor-Calibrated Semi-Synthetic / Hybrid Simulation)**
- **Total Samples**: 1,500 (805 Non-Landslide / 0, 695 Landslide / 1)
- **Features**: 19 environmental and terrain factors
- **Missing Values**: 0
- **Duplicate Rows**: 0
- **Provenance Methodology**: The dataset is grounded on **17 verified historical disaster anchors** from Geological Survey of India (GSI) and NDMA records across Northeast India (Kamrup Metropolitan, East Khasi Hills, Aizawl) and Western Ghats testbeds (Wayanad, Munnar). Around these 17 historical centroids, samples were generated using spatial perturbations ($\pm 0.035^\circ$), seasonal monsoon vs. dry hydrometeorological distributions, and empirical geotechnical Factor-of-Safety physics. *It is not a collection of raw field surveyor logs.*

### 19 Input Features Schema
| Feature Name | Type | Unit / Range | Scientific Significance |
|---|---|---|---|
| `latitude` | Float | Decimal Degrees | Spatial geographic reference |
| `longitude` | Float | Decimal Degrees | Spatial geographic reference |
| `elevation` | Float | Meters (30–2200m) | Topographic elevation |
| `slope` | Float | Degrees ($0^\circ - 75^\circ$) | Gravitational shear stress factor |
| `aspect` | Float | Degrees ($0^\circ - 360^\circ$) | Solar exposure & slope orientation |
| `rainfall_1h` | Float | mm | Flash cloudburst indicator |
| `rainfall_6h` | Float | mm | Short-term rain accumulation |
| `rainfall_12h` | Float | mm | Intermediate rain accumulation |
| `rainfall_24h` | Float | mm | Primary saturation threshold ($>100\text{mm}$ critical) |
| `rainfall_48h` | Float | mm | Sustained storm index |
| `rainfall_72h` | Float | mm | Multi-day antecedent saturation |
| `antecedent_rainfall_3d`| Float | mm (weighted) | Weighted $0.5 R_{24} + 0.3 R_{48} + 0.2 R_{72}$ |
| `soil_moisture` | Float | Ratio ($0.0 - 1.0$) | Pore-water saturation vs cohesive strength |
| `temperature` | Float | $^\circ\text{C}$ | Evaporation & weather regime |
| `humidity` | Float | % | Atmospheric saturation |
| `distance_to_road_m` | Float | Meters | Anthropogenic cut-slope toe destabilization |
| `distance_to_river_m` | Float | Meters | Basal fluvial toe erosion |
| `historical_landslide_density` | Float | Index ($0.0 - 1.0$) | Inherent spatial geological susceptibility |
| `distance_to_previous_landslide_m`| Float | Meters | Proximity to existing scar/shear plane |

---

## 4. Model Training Pipeline & Evaluation Metrics

The pipeline trains and evaluates three distinct model architectures on a stratified **80% Train / 20% Held-Out Test split** (1,200 training instances, 300 test instances).

### Rigorous Held-Out Benchmark Results (300 Test Samples)
*All metrics calculated directly on held-out test data without hardcoding:*

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Status |
|---|---|---|---|---|---|---|---|
| **Logistic Regression** | 83.33% | 82.48% | 81.29% | 0.8188 | 0.8888 | 0.8745 | Linear Baseline |
| **Random Forest** (100 Trees) | 82.00% | 81.95% | 78.42% | 0.8015 | 0.8840 | 0.8681 | Bagging Ensemble |
| **XGBoost Classifier** | **82.33%** | **80.71%** | **81.29%** | **0.8100** | **0.8841** | **0.8560** | **Production Candidate** |

### Why XGBoost is Selected Over Logistic Regression
Even though Logistic Regression achieved 83.33% accuracy on the random split:
1. **TreeSHAP Explainability**: XGBoost supports exact, fast Shapley attribution calculation via `shap.TreeExplainer` in polynomial time $\mathcal{O}(TLD^2)$, avoiding the costly background sampling approximations required for linear/kernel explainers.
2. **Non-Linear Physical Interactions**: Slope failure is non-linear; soil pore-water saturation and slope angle interact multiplicatively ($\text{Slope} \times \text{Saturation} \times \text{Toe Excavation}$). XGBoost captures these high-order interactions without manual polynomial expansion.
3. **Missing Telemetry Robustness**: Tree-based gradient boosting naturally handles missing sensor inputs by learning optimal default split directions.

### Spatial Validation (Leave-One-Cluster-Out)
To verify that the model does not merely memorize local spatial proximity, 4-fold spatial cluster cross-validation was conducted:
- **Cluster 1 (Assam Foothills)**: Accuracy 82.24%, F1 0.8146, ROC-AUC 0.8954
- **Cluster 2 (Meghalaya Plateau)**: Accuracy 82.95%, F1 0.8544, ROC-AUC 0.8926
- **Cluster 3 (Mizoram Folds)**: Accuracy 80.68%, F1 0.7991, ROC-AUC 0.8690
- **Cluster 4 (Western Ghats Anchor)**: Accuracy 81.82%, F1 0.7949, ROC-AUC 0.8810
- **Mean Spatial Cross-Validation**: **Accuracy 81.92%**, **F1 0.8157**, **ROC-AUC 0.8845**
*(Minimal drop of -0.41% compared to random 80/20 split, confirming robust regional transferability).*

### Confusion Matrix (XGBoost Held-Out Test)
- **True Negatives (TN)**: 134
- **False Positives (FP)**: 27
- **False Negatives (FN)**: 26
- **True Positives (TP)**: 113

### Top Feature Importances (XGBoost)
1. `rainfall_24h`: **0.2261** (22.6%)
2. `soil_moisture`: **0.1491** (14.9%)
3. `rainfall_48h`: **0.1133** (11.3%)
4. `rainfall_72h`: **0.0732** (7.3%)
5. `antecedent_rainfall_3d`: **0.0459** (4.6%)
6. `slope`: **0.0354** (3.5%)

---

## 5. SHAP (SHapley Additive exPlanations) Integration

Every single prediction returned by `POST /predict-risk` is interpreted using a live **SHAP TreeExplainer**:
$$\text{Output Score} = \text{Base Value} + \sum_{i=1}^{M} \phi_i$$
Where $\phi_i$ is the exact marginal attribution of feature $i$.

### Explanation Categories
- **`HIGH_RISK_DRIVER`** ($\phi_i > +0.08$): Sharp increase in slope instability.
- **`MODERATE_RISK_DRIVER`** ($+0.02 \le \phi_i \le +0.08$): Incremental hazard factor.
- **`PROTECTIVE_FACTOR`** ($\phi_i < -0.05$): Low slope or well-drained soil providing stabilization.
- **`NEUTRAL`**: Feature is near baseline equilibrium.

---

## 6. Multi-Horizon Early Warning Forecasting

The microservice projects hazard progression across 5 distinct timeframes:
- **$T+0$**: Current real-time risk.
- **$+6\text{h}$**: Short-term storm accumulation.
- **$+12\text{h}$**: Half-day forecast progression.
- **$+24\text{h}$**: Next-day sustained saturation.
- **$+48\text{h}$**: Two-day cumulative outlook.

### Risk Trend Classification
$$\Delta = \text{Risk}_{T+24\text{h}} - \text{Risk}_{T+0}$$
- $\Delta > +0.08 \implies$ **`INCREASING`** (Pre-warning & evacuation alert issued)
- $-0.05 \le \Delta \le +0.08 \implies$ **`STABLE`**
- $\Delta < -0.05 \implies$ **`DECREASING`** (Drainage outpaces precipitation)

---

## 7. Dynamic Evacuation & Shelter Intelligence

1. **Shortest vs Safest Route**:
   - Uses NetworkX Dijkstra graph algorithm.
   - When risk exceeds threshold ($\ge 0.60$), high-hazard highway corridors (e.g. NH-766 or NH-6 cut slopes) are removed/penalized.
   - The engine automatically routes civilian traffic to the guaranteed safe bypass corridor (SH-59 / Valley Road).
2. **Shelter Intelligence**:
   - Tracks relief shelter capacity, water reserves, medical staffing, and road accessibility.
   - Recommends the highest-capacity, low-hazard shelter within reach.

---

## 8. Status Classification (Honest Categorization)

| Feature / Module | Status | Description |
|---|---|---|
| **XGBoost Landslide Susceptibility** | **IMPLEMENTED** | Trained XGBoost model (`v1.0.0`) running live in FastAPI |
| **SHAP TreeExplainer** | **IMPLEMENTED** | Local feature attribution on all inference calls |
| **Multi-Horizon Forecasting** | **IMPLEMENTED** | $T+0$ to $+48\text{h}$ risk projection with trend calculation |
| **NetworkX Detour Routing** | **IMPLEMENTED** | Shortest vs Safest bypass routing with road closure triggers |
| **GIS Historical Playback** | **IMPLEMENTED** | Multi-layer Leaflet map with 2019–2026 event filtering |
| **Infrastructure Impact Analysis** | **IMPLEMENTED** | Modelled population exposure, roads at risk, and critical facility counts |
| **IndexedDB Offline Queue** | **IMPLEMENTED** | Zero-internet field reporting and automatic resync |
| **Before/After Simulation Mode** | **IMPLEMENTED** | Interactive parameter slider workbench (labeled simulation) |
| **Incident Priority Queue** | **IMPLEMENTED** | Multi-factor triage ranker in Officer/Responder portal |
| **Forensic Photo Analysis** | **PARTIALLY IMPLEMENTED** | Laplacian noise & Bayer color tensor analysis (heuristic CV) |
| **Deep Learning Vision (YOLOv8/CNN)**| **FUTURE** | Architecture ready for trained deep neural network weights |
| **IoT Sensor Fusion API** | **IMPLEMENTED** | Ingestion REST endpoint active; demo data labeled simulation |
| **Live Hardware LoRa/ESP32 Nodes** | **DEMO / SIMULATION** | Ready for physical hardware gateway deployment |
