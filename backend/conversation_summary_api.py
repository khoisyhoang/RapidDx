import os
from threading import Lock
from typing import Dict, List

import requests

from medical_diagnosis_api import get_symptoms

_conversation_store: Dict[str, List[str]] = {}
_conversation_lock = Lock()


def add_conversation_sentence(session_id: str, sentence: str) -> List[str]:
    text = (sentence or "").strip()
    if not text:
        return get_conversation_sentences(session_id)

    with _conversation_lock:
        current = _conversation_store.setdefault(session_id, [])
        current.append(text)
        return list(current)


def get_conversation_sentences(session_id: str) -> List[str]:
    with _conversation_lock:
        return list(_conversation_store.get(session_id, []))


def clear_conversation(session_id: str) -> None:
    with _conversation_lock:
        _conversation_store.pop(session_id, None)


def _build_summary_prompt(conversation_text: str, symptoms: List[str]) -> str:
    return (
        f"""
        You are a specialized medical data extractor.

        ### Task:
        Extract a chronological symptom timeline from the provided medical transcript.

        ### Constraints:
        1. Output ONLY a valid JSON object. No conversational filler or markdown code blocks (unless specified).
        2. Convert relative time (e.g., '3 days ago', 'last night') into specific YYYY-MM-DD dates based on today's date.
        3. If a specific date cannot be determined, use a descriptive timeframe (e.g., '2 weeks ago').
        4. Sort the events from EARLIEST to LATEST.

        ### JSON Schema:
        {{
        "symptom_timeline": [
            {{
            "date": "YYYY-MM-DD",
            "symptom": "Name of the symptom",
            "status": "onset / worsening / improving / resolved",
            "description": "Short detail about severity or triggers"
            }}
        ]
        }}

        ### Input Data:
        NLP Symptoms: {symptoms}
        Transcript: {conversation_text}
        """
    )


def _call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
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
        raise RuntimeError("Gemini returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [p.get("text", "") for p in parts if p.get("text")]
    summary = "\n".join(text_parts).strip()
    if not summary:
        raise RuntimeError("Gemini returned empty summary")
    return summary


def generate_session_summary(session_id: str) -> str:
    symptoms = get_symptoms(session_id)
    conversation = get_conversation_sentences(session_id)
    if not conversation:
        raise RuntimeError("No conversation found for this session")

    conversation_text = "\n".join(conversation)
    prompt = _build_summary_prompt(conversation_text, symptoms)
    summary = _call_gemini(prompt)
    return summary
