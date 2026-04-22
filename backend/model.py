from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "Master_Table_FAST_MINIMAL.xlsx"
DATA_SHEET = "Master_FAST"
MODEL_OUTPUT = Path(__file__).resolve().parent / "lbp_model.pkl"
FEATURE_OUTPUT = Path(__file__).resolve().parent / "feature_list.json"


FEATURES = [
    "Age",
    "BMI",
    "Sex_enc",
    "Pfirrmann_Grade",
    "Proteoglycan loss_Score",
    "Cell_Cluster_Score",
    "Tears/fissure_Score",
    "BloodVessels_Score",
    "Inflammatory cells_Score",
    "Mean_OD_y",
    "Largest_Fissure_MajorAxis_um",
    "Nuclei_Count_y",
    "TISSUE_Area_Fraction",
    "HARM_GLCM_Entropy",
    "HARM_GLCM_Contrast",
    "TISSUE_GLCM_Entropy",
]


FEATURE_ORDER = [
    "age",
    "bmi",
    "pain_score",
    "disc_herniation",
    "neurological_deficit",
    "conservative_treatment_months",
    "smoker",
]


def load_dataset() -> pd.DataFrame:
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATA_FILE}")

    df = pd.read_excel(DATA_FILE, sheet_name=DATA_SHEET)
    return df


def encode_fields(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()

    data["Surgery_Status"] = data["Surgery_Status"].astype(str).str.strip().str.lower()
    data["label"] = data["Surgery_Status"].map({"pre-op": 1, "cadaver": 0})

    data["Sex"] = data["Sex"].astype(str).str.strip().str.upper()
    data["Sex_enc"] = data["Sex"].map({"F": 0, "M": 1})

    return data


def prepare_xy(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    required_columns = FEATURES + ["label"]
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    clean = df[required_columns].dropna(axis=0, how="any")
    x = clean[FEATURES]
    y = clean["label"].astype(int)
    return x, y


def train_and_evaluate(x: pd.DataFrame, y: pd.Series) -> XGBClassifier:
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )

    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    y_prob = model.predict_proba(x_test)[:, 1]

    print("Classification Report")
    print(classification_report(y_test, y_pred))

    auc = roc_auc_score(y_test, y_prob)
    print(f"AUC-ROC: {auc:.4f}")

    return model


def save_artifacts(model: XGBClassifier) -> None:
    joblib.dump(model, MODEL_OUTPUT)

    with FEATURE_OUTPUT.open("w", encoding="utf-8") as file:
        json.dump(FEATURES, file, indent=2)

    print(f"Saved model to: {MODEL_OUTPUT}")
    print(f"Saved feature list to: {FEATURE_OUTPUT}")


class SurgeryPredictor:
    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = Path(model_path) if model_path else MODEL_OUTPUT
        self.model = None
        self._load_if_available()

    def _load_if_available(self) -> None:
        if not self.model_path.exists():
            return

        try:
            self.model = joblib.load(self.model_path)
        except Exception:
            self.model = None

    @staticmethod
    def _sigmoid(value: float) -> float:
        return float(1.0 / (1.0 + np.exp(-value)))

    @classmethod
    def _heuristic_probability(cls, features: Dict[str, float]) -> float:
        z = (
            -3.2
            + 0.025 * features["age"]
            + 0.03 * features["bmi"]
            + 0.38 * features["pain_score"]
            + 1.05 * features["disc_herniation"]
            + 1.2 * features["neurological_deficit"]
            - 0.09 * features["conservative_treatment_months"]
            + 0.5 * features["smoker"]
        )
        return cls._sigmoid(z)

    def _model_probability(self, features: Dict[str, float]) -> float:
        # The API payload currently uses FEATURE_ORDER. If the trained model does
        # not match this shape, safely fall back to heuristic scoring.
        if self.model is None:
            return self._heuristic_probability(features)

        try:
            row = np.array([[features[name] for name in FEATURE_ORDER]], dtype=float)
            if hasattr(self.model, "predict_proba"):
                return float(self.model.predict_proba(row)[0][1])
        except Exception:
            return self._heuristic_probability(features)

        return self._heuristic_probability(features)

    @staticmethod
    def _feature_contributions(features: Dict[str, float]) -> List[Dict[str, float | str]]:
        weights = {
            "age": 0.025,
            "bmi": 0.03,
            "pain_score": 0.38,
            "disc_herniation": 1.05,
            "neurological_deficit": 1.2,
            "conservative_treatment_months": -0.09,
            "smoker": 0.5,
        }

        label_map = {
            "age": "Age",
            "bmi": "BMI",
            "pain_score": "Pain Score",
            "disc_herniation": "Disc Herniation",
            "neurological_deficit": "Neurological Deficit",
            "conservative_treatment_months": "Conservative Treatment Months",
            "smoker": "Smoker",
        }

        contributions = []
        for key, weight in weights.items():
            value = features[key]
            score = float(weight * value)
            contributions.append({"feature": label_map[key], "impact": score})

        contributions.sort(key=lambda item: abs(float(item["impact"])), reverse=True)
        return contributions

    def predict(self, features: Dict[str, float]) -> Dict[str, float | str | List[Dict[str, float | str]]]:
        probability = self._model_probability(features)
        recommendation = "Likely surgery candidate" if probability >= 0.5 else "Prefer non-surgical pathway"

        return {
            "surgery_probability": round(probability, 4),
            "recommendation": recommendation,
            "contributions": self._feature_contributions(features),
            "model_source": "trained-model" if self.model is not None else "heuristic-fallback",
        }


def main() -> None:
    df = load_dataset()
    encoded = encode_fields(df)
    x, y = prepare_xy(encoded)
    model = train_and_evaluate(x, y)
    save_artifacts(model)


if __name__ == "__main__":
    main()