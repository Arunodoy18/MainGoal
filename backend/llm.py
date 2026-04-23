from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List

from dotenv import load_dotenv
from groq import Groq


SYSTEM_PROMPT = (
    "You are a clinical AI assistant specialized in lumbar disc degeneration and low back pain. "
    "You help doctors understand AI predictions in plain clinical language."
)

REQUIRED_KEYS = ["patient_summary", "prediction_reason", "next_steps"]

DEFAULT_GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
]


def _default_response(error_message: str) -> Dict[str, str]:
    return {
        "patient_summary": "Clinical summary unavailable due to an internal processing issue. "
        "Please review patient variables directly in the report.",
        "prediction_reason": "AI explanation could not be generated from the current model output. "
        f"Please retry after resolving: {error_message}",
        "next_steps": "Correlate this output with imaging, neurological examination, and patient-reported symptoms. "
        "Use final management decisions only after clinician review.",
    }


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Empty LLM response")

    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n", "", text)
        text = text.removesuffix("```").strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in LLM response")

    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("Parsed JSON is not an object")
    return parsed


def _candidate_groq_models() -> List[str]:
    preferred = os.getenv("GROQ_MODEL", "").strip()
    env_fallbacks = [
        model.strip()
        for model in os.getenv("GROQ_MODEL_FALLBACKS", "").split(",")
        if model.strip()
    ]

    ordered: List[str] = []
    for model in [preferred, *env_fallbacks, *DEFAULT_GROQ_MODELS]:
        if model and model not in ordered:
            ordered.append(model)
    return ordered


def explain_prediction(
    patient_dict: Dict[str, Any],
    prediction: int,
    confidence: float,
    top_features: List[str],
) -> Dict[str, str]:
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return _default_response("GROQ_API_KEY is not configured")

    outcome = "SURGERY REQUIRED" if int(prediction) == 1 else "CONSERVATIVE MANAGEMENT"
    confidence_pct = float(confidence)
    patient_lines = "\n".join([f"- {key}: {value}" for key, value in patient_dict.items()])
    top_features_text = ", ".join(top_features) if top_features else "None provided"

    user_prompt = (
        "Patient values:\n"
        f"{patient_lines}\n\n"
        "Model prediction:\n"
        f"- Outcome: {outcome}\n"
        f"- Confidence: {confidence_pct:.2f}%\n"
        f"- Top contributing biomarkers/features: {top_features_text}\n\n"
        "Return ONLY valid JSON with exactly these three keys and no additional keys:\n"
        "1) \"patient_summary\": exactly 2 sentences explaining the patient profile\n"
        "2) \"prediction_reason\": exactly 2 sentences explaining why the AI predicted this outcome based on top features\n"
        "3) \"next_steps\": exactly 2 sentences on what the doctor or patient should do next"
    )

    try:
        client = Groq(api_key=api_key)
        last_error: Exception | None = None

        for model_name in _candidate_groq_models():
            try:
                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                    max_completion_tokens=500,
                )

                content = completion.choices[0].message.content or ""
                parsed = _extract_json_object(content)

                normalized = {key: str(parsed.get(key, "")).strip() for key in REQUIRED_KEYS}
                if any(not normalized[key] for key in REQUIRED_KEYS):
                    missing = [key for key in REQUIRED_KEYS if not normalized[key]]
                    raise ValueError(f"Missing required keys in LLM response: {missing}")

                return normalized
            except Exception as exc:
                last_error = exc

        if last_error is not None:
            return _default_response(
                f"No configured Groq model succeeded. Last error: {last_error}"
            )

        return _default_response("No Groq models configured")
    except Exception as exc:
        return _default_response(str(exc))


def generate_clinician_summary(payload: dict) -> str:
    # Backward-compatible wrapper for existing endpoint usage.
    prediction_value = int(payload.get("prediction", 1 if payload.get("surgery_probability", 0) >= 0.5 else 0))
    confidence_pct = float(payload.get("confidence", payload.get("surgery_probability", 0) * 100))

    contributions = payload.get("contributions", [])
    top_features = [str(item.get("feature", "")) for item in contributions[:5] if item.get("feature")]

    explanation = explain_prediction(
        patient_dict=payload.get("patient", {}),
        prediction=prediction_value,
        confidence=confidence_pct,
        top_features=top_features,
    )

    if isinstance(explanation, dict):
        return (
            f"Patient Summary: {explanation.get('patient_summary', '')}\n\n"
            f"Prediction Reason: {explanation.get('prediction_reason', '')}\n\n"
            f"Next Steps: {explanation.get('next_steps', '')}"
        ).strip()

    return "Unable to generate clinician summary."