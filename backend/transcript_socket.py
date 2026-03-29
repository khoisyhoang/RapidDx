import json
from flask_sock import Sock
from spaghetti import diagnose_from_text, is_model_loaded, model_not_loaded_message
from medical_diagnosis_api import add_symptoms
from conversation_summary_api import add_conversation_sentence, generate_session_summary


def _is_empty_result(result: dict) -> bool:
    return (
        not result.get("symptom")
        and not result.get("diseases")
        and not result.get("body_type")
    )


def register_transcript_ws(sock: Sock) -> None:
    @sock.route("/ws/transcript")
    def transcript_stream(ws) -> None:
        while True:
            raw_message = ws.receive()
            if raw_message is None:
                break

            try:
                payload = json.loads(raw_message)
                event = payload.get("event")
                transcript_text = (payload.get("text") or "").strip()
                is_final = bool(payload.get("final", False))
                session_id = payload.get("session_id", "default-session")

                if event == "session_end":
                    try:
                        summary = generate_session_summary(session_id)
                        ws.send(
                            json.dumps(
                                {
                                    "ok": True,
                                    "event": "session_summary",
                                    "session_id": session_id,
                                    "summary": summary,
                                }
                            )
                        )
                    except Exception as exc:
                        ws.send(
                            json.dumps(
                                {
                                    "ok": False,
                                    "event": "session_summary",
                                    "session_id": session_id,
                                    "error": str(exc),
                                }
                            )
                        )
                    continue

                print(
                    f"Received transcript: '{transcript_text}' "
                )

                if not is_final:
                    ws.send(
                        json.dumps(
                            {
                                "ok": True,
                                "event": "transcript_ack",
                                "final": False,
                                "session_id": session_id,
                            }
                        )
                    )
                    continue

                if not transcript_text:
                    ws.send(
                        json.dumps(
                            {
                                "ok": False,
                                "event": "diagnosis_result",
                                "error": "text is required",
                                "session_id": session_id,
                            }
                        )
                    )
                    continue

                add_conversation_sentence(session_id, transcript_text)

                if not is_model_loaded():
                    ws.send(
                        json.dumps(
                            {
                                "ok": False,
                                "event": "diagnosis_result",
                                "error": model_not_loaded_message(),
                                "session_id": session_id,
                            }
                        )
                    )
                    continue

                result = diagnose_from_text(transcript_text)
                if _is_empty_result(result):
                    print("[diagnose] empty result, skip send.")
                    continue

                combined_symptoms = list(dict.fromkeys(result["symptom"] + result["diseases"]))
                buffered_symptoms = add_symptoms(session_id, combined_symptoms)

                ws.send(
                    json.dumps(
                        {
                            "ok": True,
                            "event": "diagnosis_result",
                            "session_id": session_id,
                            "final": True,
                            "result": result,
                            "buffered_symptoms": buffered_symptoms,
                        }
                    )
                )
            except Exception as exc:
                print("Transcript stream error:", exc)
                ws.send(
                    json.dumps(
                        {
                            "ok": False,
                            "event": "diagnosis_result",
                            "error": str(exc),
                        }
                    )
                )
