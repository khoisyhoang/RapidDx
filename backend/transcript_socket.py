import json
from flask_sock import Sock
from spaghetti import diagnose_from_text, is_model_loaded, model_not_loaded_message


def register_transcript_ws(sock: Sock) -> None:
    @sock.route("/ws/transcript")
    def transcript_stream(ws) -> None:
        while True:
            raw_message = ws.receive()
            if raw_message is None:
                break

            try:
                payload = json.loads(raw_message)
                transcript_text = (payload.get("text") or "").strip()
                is_final = bool(payload.get("final", False))
                session_id = payload.get("session_id", "default-session")

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
                ws.send(
                    json.dumps(
                        {
                            "ok": True,
                            "event": "diagnosis_result",
                            "session_id": session_id,
                            "final": True,
                            "result": result,
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
