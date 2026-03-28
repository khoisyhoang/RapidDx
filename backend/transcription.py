import json
from flask_sock import Sock

def register_transcription_ws(sock: Sock) -> None:
    @sock.route("/ws/transcript")
    def transcript_stream(ws) -> None:
        while True:
            raw_message = ws.receive()
            if raw_message is None:
                break

            try:
                payload = json.loads(raw_message)
                print("Received payload:", payload)
                transcript_text = payload.get("text", "")
                is_final = payload.get("final", False)
                session_id = payload.get("session_id", "default-session")
                
                # Log the transcript
                print(f"Received transcript: '{transcript_text}' (final: {is_final}) for session {session_id}")
                
                # Here you could save to database, broadcast to other clients, etc.
                # For now, just acknowledge receipt
                ws.send(json.dumps({"ok": True, "received": True, "text": transcript_text}))
            except Exception as exc:
                print("Transcript stream error:", exc)
                ws.send(json.dumps({"ok": False, "error": str(exc)}))
