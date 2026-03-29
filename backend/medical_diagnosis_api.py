import os
from threading import Lock
from typing import Any, Dict, List

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
