import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

def _create_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY")
    return create_client(url, key)

def test_sessions_connection() -> dict:
    try:
        supabase = _create_supabase_client()
        response = supabase.table("sessions").select("*").execute()
        rows = response.data or []
        return {
            "ok": True,
            "table": "sessions",
            "rows_preview_count": len(rows),
            "rows": rows,
            "message": "Connection test passed.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "table": "sessions",
            "message": f"Connection test failed: {exc}",
        }


def save_session_summary_and_symptoms(
    app_session_id: str,
    symptoms: List[str],
    anatomy: List[str],
    summary_text: str,
    conservation_record: str,
    patient_id: int | None = None,
    doctor_id: int | None = None,
) -> Dict[str, Any]:
    supabase = _create_supabase_client()

    row = {
        "patient_id": patient_id if patient_id is not None else 1,
        "doctor_id": doctor_id if doctor_id is not None else 1,
        "symptoms": symptoms,
        "anatomy": anatomy,
        "summary": {
            "app_session_id": app_session_id,
            "text": summary_text,
        },
        "conservation_record": conservation_record,
    }

    response = supabase.table("sessions").insert(row).execute()
    inserted = response.data[0] if response.data else {}
    return {
        "ok": True,
        "table": "sessions",
        "inserted": inserted,
    }
