import os
from threading import Lock
from typing import Any, Dict, List
import json

import requests
from flask import Blueprint, jsonify, request

diagnosis_bp = Blueprint("diagnosis_http", __name__)

_store: Dict[str, List[str]] = {}
_lock = Lock()


def add_symptoms(session_id: str, symptoms: List[str]) -> List[str]:
    if not symptoms:
        return get_symptoms(session_id)

    with _lock:
        current = _store.setdefault(session_id, [])
        for item in symptoms:
            if item and item not in current:
                current.append(item)
        return list(current)


def get_symptoms(session_id: str) -> List[str]:
    with _lock:
        return list(_store.get(session_id, []))


def clear_symptoms(session_id: str) -> None:
    with _lock:
        _store.pop(session_id, None)


def build_request_payload(symptoms: List[str], age: int = 20, gender: str = "male") -> Dict[str, Any]:
    return {
        "symptom": symptoms,
        "age": age,
        "gender": gender,
    }


def call_medical_diagnosis_api(payload: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("RAPIDAPI_KEY", "").strip()
    if not api_key:
        raise RuntimeError("RAPIDAPI_KEY is not set")

    endpoint = "https://ai-medical-diagnosis-api-symptoms-to-results.p.rapidapi.com/analyzeSymptomsAndDiagnose"

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "ai-medical-diagnosis-api-symptoms-to-results.p.rapidapi.com",
        "Content-Type": "application/json",
    }

    response = requests.post(endpoint, headers=headers, json=payload, timeout=20)
    response.raise_for_status()

    try:
        return response.json()
    except ValueError as exc:
        raise RuntimeError(f"Medical diagnosis API returned non-JSON response: {exc}") from exc


def _call_gemini_bodypart_analysis(body_part: str, symptoms: List[str]) -> List[Dict[str, str]]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    prompt = (
        "You are a clinical triage assistant. "
        "Given one body part and a symptom list, return ONLY valid JSON with this schema:\n"
        "{ \"items\": ["
        "{ \"symptom\": string, \"description\": string, \"risk_level\": \"low\"|\"medium\"|\"high\" }"
        "] }\n"
        "Rules:\n"
        "- Return only symptoms relevant to the provided body part.\n"
        "- Keep description concise (max 20 words).\n"
        "- risk_level must be one of low, medium, high.\n"
        "- No markdown, no extra text.\n\n"
        f"Body part: {body_part}\n"
        f"Symptoms: {symptoms}"
    )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2},
    }

    response = requests.post(endpoint, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return []

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "\n".join([p.get("text", "") for p in parts if p.get("text")]).strip()
    if not text:
        return []

    parsed = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Some models wrap JSON in code fences.
        cleaned = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)

    items = parsed.get("items", []) if isinstance(parsed, dict) else []
    result = []
    for item in items:
        symptom = str(item.get("symptom", "")).strip()
        description = str(item.get("description", "")).strip()
        risk_level = str(item.get("risk_level", "")).strip().lower()
        if not symptom or not description or risk_level not in {"low", "medium", "high"}:
            continue
        result.append(
            {
                "symptom": symptom,
                "description": description,
                "risk_level": risk_level,
            }
        )
    return result


@diagnosis_bp.route("/api/diagnose", methods=["POST"])
def diagnose_from_buffer():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id", "default-session")
    age = int(payload.get("age", 20))
    gender = str(payload.get("gender", "male"))

    symptoms = get_symptoms(session_id)
    if not symptoms:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "No buffered symptoms for this session",
                    "session_id": session_id,
                    "symptom": [],
                }
            ),
            400,
        )

    diagnosis_payload = build_request_payload(symptoms, age=age, gender=gender)
    try:
        diagnosis_result = call_medical_diagnosis_api(diagnosis_payload)
    except Exception as exc:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(exc),
                    "session_id": session_id,
                    "payload": diagnosis_payload,
                }
            ),
            502,
        )

    return jsonify(
        {
            "success": True,
            "session_id": session_id,
            "payload": diagnosis_payload,
            "diagnosis_result": diagnosis_result,
        }
    )


@diagnosis_bp.route("/api/bodypart/analyze", methods=["POST"])
def analyze_bodypart_with_gemini():
    payload = request.get_json(silent=True) or {}
    body_part = str(payload.get("body_part", "")).strip()
    symptoms = payload.get("symptoms") or []
    if not isinstance(symptoms, list):
        symptoms = []

    if not body_part:
        return jsonify({"success": False, "error": "body_part is required"}), 400
    if not symptoms:
        return jsonify({"success": True, "body_part": body_part, "symptoms": [], "items": [], "skipped": True})

    try:
        items = _call_gemini_bodypart_analysis(body_part=body_part, symptoms=symptoms)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

    return jsonify(
        {
            "success": True,
            "body_part": body_part,
            "symptoms": symptoms,
            "items": items,
        }
    )
