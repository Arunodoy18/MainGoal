from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Column, Float, Integer, String, create_engine, func
from sqlalchemy.orm import declarative_base, sessionmaker

from llm import explain_prediction


load_dotenv()

MODEL_PATH = Path(__file__).resolve().parent / "lbp_model.pkl"
FEATURE_LIST_PATH = Path(__file__).resolve().parent / "feature_list.json"
DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "Master_Table_FAST_MINIMAL.xlsx"
DATA_SHEET = "Master_FAST"
SCREENING_DB_PATH = Path(__file__).resolve().parent / "screening_data.db"


def resolve_screening_database_url() -> str:
    env_database_url = os.getenv("DATABASE_URL", "").strip()
    if env_database_url:
        # Some providers use postgres://; SQLAlchemy expects postgresql://
        if env_database_url.startswith("postgres://"):
            return env_database_url.replace("postgres://", "postgresql://", 1)
        return env_database_url

    # Local development fallback
    return f"sqlite:///{SCREENING_DB_PATH}"


SCREENING_DB_URL = resolve_screening_database_url()


def ensure_model_artifacts() -> None:
    if MODEL_PATH.exists() and FEATURE_LIST_PATH.exists():
        return

    from model import main as train_model_artifacts

    train_model_artifacts()

    if not MODEL_PATH.exists() or not FEATURE_LIST_PATH.exists():
        raise FileNotFoundError(
            "Model artifacts were not generated. Expected lbp_model.pkl and feature_list.json"
        )

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://praana-lbp.netlify.app",
    "https://praana-lbp-maingoal.netlify.app",
]


engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
if SCREENING_DB_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

screening_engine = create_engine(SCREENING_DB_URL, **engine_kwargs)
ScreeningSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=screening_engine)
ScreeningBase = declarative_base()


class ScreeningResponse(ScreeningBase):
    __tablename__ = "screening_responses"

    id = Column(Integer, primary_key=True, index=True)
    oswestry_score = Column(Float, nullable=False)
    vas_score = Column(Integer, nullable=False)
    severity_label = Column(String(100), nullable=False)
    patient_age = Column(Integer, nullable=True)
    patient_sex = Column(String(24), nullable=True)
    timestamp = Column(String(64), nullable=False)


def resolve_cors_origins() -> List[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "").strip()
    if not raw_origins:
        return DEFAULT_CORS_ORIGINS

    parsed = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    return parsed or DEFAULT_CORS_ORIGINS


origins = resolve_cors_origins()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = None
    app.state.feature_list = []
    app.state.explainer = None
    app.state.model_loaded = False
    app.state.startup_error = None
    app.state.screening_db_ready = False
    app.state.screening_db_error = None
    
    app.state.dataset_stats = {
        "total_patients": 0,
        "pre_op_count": 0,
        "cadaver_count": 0,
        "region_counts": {},
        "pfirrmann_distribution": {}
    }

    try:
        ScreeningBase.metadata.create_all(bind=screening_engine)
        app.state.screening_db_ready = True
    except Exception as exc:
        app.state.screening_db_error = str(exc)

    try:
        if DATA_FILE.exists():
            df = pd.read_excel(DATA_FILE, sheet_name=DATA_SHEET)
            app.state.dataset_stats["total_patients"] = int(len(df))
            
            if "Surgery_Status" in df.columns:
                status_counts = df["Surgery_Status"].astype(str).str.strip().str.lower().value_counts()
                app.state.dataset_stats["pre_op_count"] = int(status_counts.get("pre-op", 0))
                app.state.dataset_stats["cadaver_count"] = int(status_counts.get("cadaver", 0))
                
            if "Region" in df.columns:
                app.state.dataset_stats["region_counts"] = df["Region"].astype(str).value_counts().to_dict()
                
            if "Pfirrmann_Grade" in df.columns:
                app.state.dataset_stats["pfirrmann_distribution"] = df["Pfirrmann_Grade"].value_counts().to_dict()
    except Exception as exc:
        print(f"Failed to load dataset stats: {exc}")

    try:
        ensure_model_artifacts()

        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

        if not FEATURE_LIST_PATH.exists():
            raise FileNotFoundError(f"Feature list file not found: {FEATURE_LIST_PATH}")

        with FEATURE_LIST_PATH.open("r", encoding="utf-8") as file:
            feature_list = json.load(file)

        if not isinstance(feature_list, list) or not all(isinstance(item, str) for item in feature_list):
            raise ValueError("feature_list.json must contain a JSON array of feature name strings")

        app.state.model = joblib.load(MODEL_PATH)
        app.state.feature_list = feature_list
        app.state.explainer = shap.Explainer(app.state.model)
        app.state.model_loaded = True
    except Exception as exc:
        app.state.startup_error = str(exc)

    yield


app = FastAPI(title="PRAANA-LBP API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    age: float = Field(..., ge=0, le=120)
    bmi: float = Field(..., ge=10, le=60)
    sex: str | int
    disc_level: str
    pfirrmann_grade: float
    proteoglycan_loss: float
    cell_cluster: float
    tears_fissure: float
    blood_vessels: float
    inflammatory_cells: float
    mean_od: float
    fissure_major_axis: float
    nuclei_count: float
    tissue_area_fraction: float
    harm_entropy: float
    harm_contrast: float
    tissue_entropy: float


class ScreeningSubmission(BaseModel):
    oswestry_score: float = Field(..., ge=0, le=100)
    vas_score: int = Field(..., ge=0, le=10)
    severity_label: str = Field(..., min_length=1)
    timestamp: str = Field(..., min_length=1)
    patient_age: int | None = Field(default=None, ge=0, le=120)
    patient_sex: str | None = None


def encode_sex(value: str | int) -> int:
    if isinstance(value, int):
        if value in (0, 1):
            return value
        raise ValueError("sex as integer must be 0 or 1")

    normalized = str(value).strip().upper()
    if normalized in {"F", "FEMALE", "0"}:
        return 0
    if normalized in {"M", "MALE", "1"}:
        return 1
    raise ValueError("sex must be one of: F, M, 0, 1, female, male")


def build_feature_row(payload: PredictionInput, feature_list: List[str]) -> Dict[str, float]:
    payload_data = payload.model_dump()
    feature_map: Dict[str, float] = {
        "Age": float(payload_data["age"]),
        "BMI": float(payload_data["bmi"]),
        "Sex_enc": float(encode_sex(payload_data["sex"])),
        "Pfirrmann_Grade": float(payload_data["pfirrmann_grade"]),
        "Proteoglycan loss_Score": float(payload_data["proteoglycan_loss"]),
        "Cell_Cluster_Score": float(payload_data["cell_cluster"]),
        "Tears/fissure_Score": float(payload_data["tears_fissure"]),
        "BloodVessels_Score": float(payload_data["blood_vessels"]),
        "Inflammatory cells_Score": float(payload_data["inflammatory_cells"]),
        "Mean_OD_y": float(payload_data["mean_od"]),
        "Largest_Fissure_MajorAxis_um": float(payload_data["fissure_major_axis"]),
        "Nuclei_Count_y": float(payload_data["nuclei_count"]),
        "TISSUE_Area_Fraction": float(payload_data["tissue_area_fraction"]),
        "HARM_GLCM_Entropy": float(payload_data["harm_entropy"]),
        "HARM_GLCM_Contrast": float(payload_data["harm_contrast"]),
        "TISSUE_GLCM_Entropy": float(payload_data["tissue_entropy"]),
    }

    missing = [feature for feature in feature_list if feature not in feature_map]
    if missing:
        raise ValueError(f"Feature mapping missing required model features: {missing}")

    return {name: feature_map[name] for name in feature_list}


def extract_top_features(explainer: Any, feature_df: pd.DataFrame, feature_list: List[str], top_k: int = 3) -> List[str]:
    shap_values = explainer(feature_df)
    values = np.array(shap_values.values)

    if values.ndim == 3:
        # For classifiers where SHAP returns per-class values, use positive class.
        vector = values[0, :, -1]
    elif values.ndim == 2:
        vector = values[0]
    elif values.ndim == 1:
        vector = values
    else:
        raise ValueError("Unexpected SHAP value dimensions")

    top_indices = np.argsort(np.abs(vector))[::-1][:top_k]
    return [feature_list[int(index)] for index in top_indices]


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "model_loaded": bool(getattr(app.state, "model_loaded", False)),
    }


@app.get("/dataset-stats")
def get_dataset_stats() -> dict:
    return getattr(
        app.state,
        "dataset_stats",
        {
            "total_patients": 0,
            "pre_op_count": 0,
            "cadaver_count": 0,
            "region_counts": {},
            "pfirrmann_distribution": {},
        },
    )


@app.post("/predict")
def predict_surgery_risk(payload: PredictionInput) -> dict:
    try:
        model_loaded = bool(getattr(app.state, "model_loaded", False))
        if not model_loaded:
            startup_error = getattr(app.state, "startup_error", None) or "Model is not loaded"
            raise HTTPException(status_code=503, detail=startup_error)

        feature_list = getattr(app.state, "feature_list", [])
        model = getattr(app.state, "model", None)
        explainer = getattr(app.state, "explainer", None)

        if not feature_list or model is None or explainer is None:
            raise HTTPException(status_code=503, detail="Model state is not ready")

        row = build_feature_row(payload, feature_list)
        feature_df = pd.DataFrame([row], columns=feature_list)

        prediction = int(model.predict(feature_df)[0])
        confidence = float(model.predict_proba(feature_df)[0][1] * 100)

        top_features = extract_top_features(explainer, feature_df, feature_list, top_k=3)

        llm_explanation = explain_prediction(
            patient_dict=payload.model_dump(),
            prediction=prediction,
            confidence=confidence,
            top_features=top_features,
        )

        if confidence > 70:
            risk_level = "HIGH"
        elif confidence > 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "surgery_required": bool(prediction == 1),
            "confidence": round(confidence, 2),
            "risk_level": risk_level,
            "top_features": top_features,
            "llm_explanation": llm_explanation,
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.post("/api/screening-data")
def receive_screening_data(payload: ScreeningSubmission) -> dict:
    if not bool(getattr(app.state, "screening_db_ready", False)):
        error_detail = getattr(app.state, "screening_db_error", None) or "Screening database is not available"
        raise HTTPException(status_code=503, detail=error_detail)

    session = ScreeningSessionLocal()
    try:
        record = ScreeningResponse(
            oswestry_score=float(payload.oswestry_score),
            vas_score=int(payload.vas_score),
            severity_label=payload.severity_label.strip(),
            patient_age=payload.patient_age,
            patient_sex=payload.patient_sex.strip() if payload.patient_sex else None,
            timestamp=payload.timestamp,
        )
        session.add(record)
        session.commit()
        session.refresh(record)

        return {
            "status": "received",
            "message": "Screening data stored successfully",
            "record_id": record.id,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to store screening data: {exc}") from exc
    finally:
        session.close()


@app.get("/api/screening-stats")
def get_screening_stats() -> dict:
    if not bool(getattr(app.state, "screening_db_ready", False)):
        error_detail = getattr(app.state, "screening_db_error", None) or "Screening database is not available"
        raise HTTPException(status_code=503, detail=error_detail)

    session = ScreeningSessionLocal()
    try:
        total_responses = session.query(func.count(ScreeningResponse.id)).scalar() or 0
        average_oswestry_score = session.query(func.avg(ScreeningResponse.oswestry_score)).scalar()
        average_vas_score = session.query(func.avg(ScreeningResponse.vas_score)).scalar()

        severity_rows = (
            session.query(ScreeningResponse.severity_label, func.count(ScreeningResponse.id))
            .group_by(ScreeningResponse.severity_label)
            .all()
        )
        severity_distribution = {
            str(label): int(count)
            for label, count in severity_rows
        }

        return {
            "total_responses": int(total_responses),
            "average_oswestry_score": (
                round(float(average_oswestry_score), 2)
                if average_oswestry_score is not None
                else 0.0
            ),
            "severity_distribution": severity_distribution,
            "average_vas_score": (
                round(float(average_vas_score), 2)
                if average_vas_score is not None
                else 0.0
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch screening stats: {exc}") from exc
    finally:
        session.close()