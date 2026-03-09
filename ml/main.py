# ============================================================
# SCHEME GUARD — ML Microservice (Python FastAPI)
# File: ml_service/main.py
# Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ============================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV, cross_validate, StratifiedKFold
import shap
import joblib
import logging
import os
import difflib
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Scheme Guard ML Service",
    description="Fraud detection microservice using Isolation Forest + Logistic Regression + SHAP",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

# ─── SCHEMAS ─────────────────────────────────────────────────
class PredictRequest(BaseModel):
    income: float
    aadhaar_frequency: int  # How many times this Aadhaar appears
    bank_overlap: int        # How many people share this bank account
    income_ratio: float      # income / scheme_threshold
    district: str
    scheme: str
    beneficiary_id: Optional[str] = None

    @validator('income')
    def income_positive(cls, v):
        if v < 0: raise ValueError('Income must be non-negative')
        return v

    @validator('aadhaar_frequency', 'bank_overlap')
    def positive_int(cls, v):
        if v < 1: raise ValueError('Frequency must be at least 1')
        return v

class PredictResponse(BaseModel):
    beneficiary_id: Optional[str]
    probability: float
    risk_level: str
    anomaly_score: float
    shap_values: Dict[str, float]
    top_features: list
    model_version: str
    timestamp: str

class SimilarityCandidate(BaseModel):
    id: str
    text: str

class SimilarityRequest(BaseModel):
    source_text: str
    candidates: list[SimilarityCandidate]

class SimilarityResponse(BaseModel):
    is_duplicate: bool
    highest_score: float
    matched_candidate_id: Optional[str]
    match_type: str  # 'exact', 'fuzzy', 'semantic', 'none'

# ─── SAMPLE TRAINING DATA ─────────────────────────────────────
# In production, load from MongoDB or a feature store
def generate_training_data(n_legitimate=800, n_fraud=200):
    np.random.seed(42)

    # Legitimate beneficiaries
    legitimate = {
        'income': np.random.normal(20000, 5000, n_legitimate).clip(5000, 35000),
        'aadhaar_frequency': np.ones(n_legitimate) + np.random.poisson(0.05, n_legitimate),
        'bank_overlap': np.ones(n_legitimate) + np.random.poisson(0.1, n_legitimate),
        'income_ratio': np.random.uniform(0.3, 0.9, n_legitimate),
        'district_risk': np.random.uniform(0.1, 0.5, n_legitimate),
        'scheme_age_days': np.random.normal(180, 60, n_legitimate).clip(30, 365),
        'past_clearances': np.random.poisson(1.5, n_legitimate),
        'flag_count': np.zeros(n_legitimate),
        'label': np.zeros(n_legitimate)
    }

    # Fraudulent patterns
    fraud = {
        'income': np.random.normal(45000, 15000, n_fraud).clip(30000, 90000),
        'aadhaar_frequency': np.random.randint(2, 8, n_fraud).astype(float),
        'bank_overlap': np.random.randint(3, 15, n_fraud).astype(float),
        'income_ratio': np.random.uniform(1.2, 3.0, n_fraud),
        'district_risk': np.random.uniform(0.6, 1.0, n_fraud),
        'scheme_age_days': np.random.normal(30, 15, n_fraud).clip(1, 90),
        'past_clearances': np.zeros(n_fraud),
        'flag_count': np.random.randint(1, 4, n_fraud).astype(float),
        'label': np.ones(n_fraud)
    }

    df_leg = pd.DataFrame(legitimate)
    df_fraud = pd.DataFrame(fraud)
    df = pd.concat([df_leg, df_fraud]).sample(frac=1, random_state=42).reset_index(drop=True)
    return df

FEATURE_NAMES = [
    'income', 'aadhaar_frequency', 'bank_overlap',
    'income_ratio', 'district_risk', 'scheme_age_days',
    'past_clearances', 'flag_count'
]

DISTRICT_RISK_MAP = {
    'Varanasi': 0.82, 'Agra': 0.71, 'Lucknow': 0.65,
    'Meerut': 0.60, 'Kanpur': 0.58, 'Prayagraj': 0.42,
    'Gorakhpur': 0.45, 'Mathura': 0.38,
}

# ─── MODEL TRAINING ─────────────────────────────────────────
class SchemeGuardModel:
    # Ensemble weight defaults: (iso_forest_weight, logistic_regression_weight)
    DEFAULT_ENSEMBLE_WEIGHTS = (0.4, 0.6)

    def __init__(self, ensemble_weights=None):
        """ensemble_weights: tuple (w_anomaly, w_lr) that must sum to 1.0."""
        self.ensemble_weights = ensemble_weights or self.DEFAULT_ENSEMBLE_WEIGHTS
        # Base pipeline — will be replaced by best estimator from GridSearchCV
        self.lr_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('lr', LogisticRegression(
                class_weight='balanced',
                max_iter=1000,
                random_state=42
            ))
        ])
        # IsolationForest — contamination chosen via _tune_isolation_forest()
        self.iso_forest = IsolationForest(
            n_estimators=200,
            contamination=0.15,     # tuned during train()
            max_features=0.8,
            random_state=42
        )
        self.explainer = None
        self.is_trained = False
        self.version = "2.0-isolation-forest"

    # ── Private helper ────────────────────────────────────────
    def _tune_isolation_forest(self, X: np.ndarray) -> tuple:
        """Try contamination values in [0.10, 0.15, 0.20] and return the
        (best_contamination, fitted_IsolationForest) that maximises the spread
        between the top-25% and bottom-25% anomaly decision scores."""
        candidates = [0.10, 0.15, 0.20]
        best_spread = -np.inf
        best_contamination = 0.15
        best_iso = None

        for c in candidates:
            iso = IsolationForest(
                n_estimators=200,
                contamination=c,
                max_features=0.8,
                random_state=42
            )
            iso.fit(X)
            scores = iso.decision_function(X)
            spread = np.percentile(scores, 75) - np.percentile(scores, 25)
            logger.info(f"IsolationForest contamination={c:.2f} → score spread={spread:.4f}")
            if spread > best_spread:
                best_spread = spread
                best_contamination = c
                best_iso = iso

        logger.info(f"✅ Best IsolationForest contamination={best_contamination} (spread={best_spread:.4f})")
        return best_contamination, best_iso

    # ── Training ─────────────────────────────────────────────
    def train(self, df: pd.DataFrame):
        X = df[FEATURE_NAMES].values
        y = df['label'].values

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

        # ── Step 1: GridSearchCV to find best C for LogisticRegression ──────
        param_grid = {'lr__C': [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]}
        grid = GridSearchCV(
            self.lr_pipeline,
            param_grid,
            cv=cv,
            scoring=['roc_auc', 'recall'],
            refit='recall',      # maximise Recall (fraud detection priority)
            n_jobs=-1,
            verbose=1
        )
        grid.fit(X, y)
        self.lr_pipeline = grid.best_estimator_   # best Pipeline (Scaler + LR)

        best_C = grid.best_params_['lr__C']
        best_recall = grid.cv_results_['mean_test_recall'][grid.best_index_]
        best_auc    = grid.cv_results_['mean_test_roc_auc'][grid.best_index_]
        logger.info(
            f"GridSearchCV complete — Best C={best_C}, "
            f"CV Recall={best_recall:.4f}, CV AUC={best_auc:.4f}"
        )

        # ── Step 2: 5-fold cross-validation report ───────────────────────────
        cv_results = cross_validate(
            self.lr_pipeline, X, y,
            cv=cv,
            scoring=['roc_auc', 'recall'],
            return_train_score=False
        )
        logger.info(
            f"5-Fold CV — "
            f"ROC-AUC: {cv_results['test_roc_auc'].mean():.4f} ± {cv_results['test_roc_auc'].std():.4f} | "
            f"Recall: {cv_results['test_recall'].mean():.4f} ± {cv_results['test_recall'].std():.4f}"
        )

        # Guard: warn if AUC target is not met
        if cv_results['test_roc_auc'].mean() < 0.90:
            logger.warning(
                f"⚠️  Mean CV AUC={cv_results['test_roc_auc'].mean():.4f} is below 0.90 target. "
                "Consider increasing training data or feature engineering."
            )

        # ── Step 3: Tune IsolationForest contamination ───────────────────────
        _, best_iso = self._tune_isolation_forest(X)
        self.iso_forest = best_iso
        logger.info("IsolationForest tuning complete")

        # ── Step 4: SHAP Explainer ───────────────────────────────────────────
        scaler = self.lr_pipeline.named_steps['scaler']
        X_scaled = scaler.transform(X[:100])   # background sample
        lr = self.lr_pipeline.named_steps['lr']
        self.explainer = shap.LinearExplainer(lr, X_scaled, feature_names=FEATURE_NAMES)
        logger.info("SHAP explainer initialized")

        # ── Step 5: Persist model ────────────────────────────────────────────
        self.is_trained = True
        model_path = os.path.join(os.path.dirname(__file__), 'scheme_guard_model.pkl')
        joblib.dump(self, model_path)
        logger.info(f"scheme_guard_model.pkl saved → {model_path}")
        logger.info("✅ Model training complete")

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        # Phase 1: Anomaly score from Isolation Forest
        # iso_forest.decision_function: lower = more anomalous
        anomaly_raw = self.iso_forest.decision_function(features)[0]
        # Normalize to 0-1 (1 = most anomalous)
        anomaly_score = float(np.clip(1 - (anomaly_raw + 0.5), 0, 1))

        # Phase 2: Fraud probability from Logistic Regression
        lr_prob = self.lr_pipeline.predict_proba(features)[0][1]

        # Ensemble: weighted average (weights configurable at train time)
        w_iso, w_lr = self.ensemble_weights
        probability = float(w_iso * anomaly_score + w_lr * lr_prob)
        probability = np.clip(probability, 0, 1)

        # Risk level
        risk_level = 'HIGH' if probability >= 0.70 else 'MEDIUM' if probability >= 0.40 else 'LOW'

        # SHAP values
        scaler = self.lr_pipeline.named_steps['scaler']
        X_scaled = scaler.transform(features)
        shap_vals = self.explainer.shap_values(X_scaled)[0]

        shap_dict = {name: float(abs(val)) for name, val in zip(FEATURE_NAMES, shap_vals)}

        # Top 3 features by importance
        top_features = sorted(shap_dict.items(), key=lambda x: x[1], reverse=True)[:3]
        top_features = [{"feature": k, "importance": round(v, 4)} for k, v in top_features]

        return {
            "probability": round(probability, 4),
            "risk_level": risk_level,
            "anomaly_score": round(anomaly_score, 4),
            "shap_values": {k: round(v, 4) for k, v in shap_dict.items()},
            "top_features": top_features,
        }

# Initialize and train model on startup
model = SchemeGuardModel()

@app.on_event("startup")
async def startup_event():
    logger.info("Training models on startup...")
    df = generate_training_data()
    model.train(df)
    logger.info("🛡️ Scheme Guard ML Service ready")

# ─── ROUTES ──────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_trained": model.is_trained,
        "version": model.version,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not model.is_trained:
        raise HTTPException(status_code=503, detail="Model not yet trained")

    try:
        # Build feature vector
        district_risk = DISTRICT_RISK_MAP.get(request.district, 0.50)
        flag_count = (
            (1 if request.aadhaar_frequency > 1 else 0) +
            (1 if request.bank_overlap > 2 else 0) +
            (1 if request.income_ratio > 1.0 else 0)
        )

        features = np.array([[
            request.income,
            request.aadhaar_frequency,
            request.bank_overlap,
            request.income_ratio,
            district_risk,
            180,  # default scheme_age_days; replace with real data
            0,    # past_clearances
            flag_count,
        ]])

        result = model.predict(features)

        return PredictResponse(
            beneficiary_id=request.beneficiary_id,
            model_version=model.version,
            timestamp=datetime.utcnow().isoformat(),
            **result
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/batch-predict")
def batch_predict(requests: list[PredictRequest]):
    """Batch scoring for multiple beneficiaries"""
    if not model.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained")
    results = []
    for req in requests:
        try:
            result = predict(req)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e), "beneficiary_id": req.beneficiary_id})
    return results

@app.get("/model/info")
def model_info():
    return {
        "version": model.version,
        "features": FEATURE_NAMES,
        "algorithms": ["IsolationForest", "LogisticRegression"],
        "explainability": "SHAP LinearExplainer",
        "contamination": 0.2,
        "n_estimators": 200
    }

@app.post("/check-similarity", response_model=SimilarityResponse)
def check_similarity(req: SimilarityRequest):
    """
    Check if source_text is a duplicate of any candidate texts.
    Uses SequenceMatcher for fuzzy matching and TF-IDF Cosine Similarity for semantic matching.
    """
    if not req.candidates:
        return SimilarityResponse(is_duplicate=False, highest_score=0.0, matched_candidate_id=None, match_type='none')

    source = req.source_text.lower().strip()
    
    highest_score = 0.0
    best_match_id = None
    match_type = 'none'

    # 1. Exact and Fuzzy Matching via SequenceMatcher (Character Level)
    for c in req.candidates:
        cand_text = c.text.lower().strip()
        
        if source == cand_text:
            return SimilarityResponse(is_duplicate=True, highest_score=1.0, matched_candidate_id=c.id, match_type='exact')

        # Fuzzy string match ratio
        ratio = difflib.SequenceMatcher(None, source, cand_text).ratio()
        if ratio > highest_score:
            highest_score = ratio
            best_match_id = c.id
            if ratio >= 0.85:
                match_type = 'fuzzy'

    # If fuzzy match is strong enough, return immediately
    if highest_score >= 0.85:
        return SimilarityResponse(is_duplicate=True, highest_score=highest_score, matched_candidate_id=best_match_id, match_type=match_type)

    # 2. Semantic Similarity via TF-IDF (Word Level)
    try:
        corpus = [source] + [c.text.lower().strip() for c in req.candidates]
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        # Calculate cosine similarity of source against all candidates
        cosine_sims = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        max_semantic_idx = np.argmax(cosine_sims)
        max_semantic_score = float(cosine_sims[max_semantic_idx])
        
        if max_semantic_score > highest_score:
            highest_score = max_semantic_score
            best_match_id = req.candidates[max_semantic_idx].id
            
            if max_semantic_score >= 0.85:
                match_type = 'semantic'
                
    except Exception as e:
        logger.error(f"Semantic similarity error: {e}")

    is_duplicate = highest_score >= 0.85
    return SimilarityResponse(
        is_duplicate=is_duplicate,
        highest_score=round(highest_score, 4),
        matched_candidate_id=best_match_id if is_duplicate else None,
        match_type=match_type if is_duplicate else 'none'
    )


# ============================================================
# requirements.txt for ML service:
# ============================================================
# fastapi==0.104.1
# uvicorn==0.24.0
# pydantic==2.5.0
# scikit-learn==1.3.2
# shap==0.43.0
# pandas==2.1.3
# numpy==1.26.2
# joblib==1.3.2
# httpx==0.25.2

# ============================================================
# To run:
# pip install -r requirements.txt
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ============================================================
