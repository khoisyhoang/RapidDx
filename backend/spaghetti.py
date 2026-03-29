from flask import Blueprint, jsonify, request
import re
import scispacy
from scispacy.linking import EntityLinker
import spacy
from conversation_summary_api import add_conversation_sentence
from medical_diagnosis_api import add_symptoms

# T023, T029, T030: Body Part
# T184: Sign or Symptom
# T047: Disease or Syndrome
TARGET_TYPES = {"T023", "T029", "T030", "T184", "T047"}
TYPE_TO_BUCKET = {"T184": "symptom", "T047": "diseases", "T023": "body_type", "T029": "body_type", "T030": "body_type"}
SCISPACY_TO_GROUP_MAPPING = {
    "Chest": "chest",
    "Upper arm": "arms",
    "Shoulder": "shoulders",
    "Leg": "legs",
    "Foot": "feet",
    "Head": "head",
    "Hand": "hands",
    "Pharyngeal structure": "neck",
}

nlp = spacy.load("en_core_sci_md")
nlp.add_pipe("scispacy_linker", config={"resolve_abbreviations": True, "linker_name": "umls"})
scispacy_bp = Blueprint("scispacy_test", __name__)

def is_model_loaded() -> bool:
    return nlp is not None


def model_not_loaded_message() -> str:
    return (
        "scispacy model not loaded. Install with: "
        "pip install scispacy && "
        "pip install "
        "https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.1/"
        "en_core_sci_lg-0.5.1.tar.gz"
    )


def diagnose_from_text(text: str) -> dict:
    if nlp is None:
        raise RuntimeError(model_not_loaded_message())

    doc = nlp(text)
    linker = nlp.get_pipe("scispacy_linker")

    result = {"symptom": [], "diseases": [], "body_type": []}
    seen = {key: set() for key in result}
    lower_text = text.lower()

    # Hardcoded fallback: if these terms appear in transcript, add mapped body group directly.
    for source_term, grouped_value in SCISPACY_TO_GROUP_MAPPING.items():
        pattern = rf"\b{re.escape(source_term.lower())}\b"
        if re.search(pattern, lower_text) and grouped_value not in seen["body_type"]:
            result["body_type"].append(grouped_value)
            seen["body_type"].add(grouped_value)

    for ent in doc.ents:
        best_match = None
        for cui, score in ent._.kb_ents[:5]:
            concept = linker.kb.cui_to_entity[cui]
            matched_types = [t for t in concept.types if t in TARGET_TYPES]
            if not matched_types:
                continue
            if score > 0.9 and (best_match is None or score > best_match["score"]):
                best_match = {
                    "name": concept.canonical_name,
                    "types": matched_types,
                    "score": score,
                }

        if best_match is None:
            continue

        for t in best_match["types"]:
            bucket = TYPE_TO_BUCKET[t]
            value = best_match["name"]
            if bucket == "body_type":
                value = SCISPACY_TO_GROUP_MAPPING.get(value, value)
            if value not in seen[bucket]:
                result[bucket].append(value)
                seen[bucket].add(value)

    return result


@scispacy_bp.route("/api/scispacy/process", methods=["GET", "POST"])
def process_scispacy_text():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or request.args.get("text") or "").strip()
    session_id = (payload.get("session_id") or request.args.get("session_id") or "test-session-browser").strip()

    if not text:
        text = "I have headache and chest pain with coughing for two days."

    try:
        result = diagnose_from_text(text)
        add_conversation_sentence(session_id, text)

        combined_symptoms = list(dict.fromkeys(result.get("symptom", []) + result.get("diseases", [])))
        buffered_symptoms = add_symptoms(session_id, combined_symptoms)

        return jsonify(
            {
                "success": True,
                "session_id": session_id,
                "text": text,
                "result": result,
                "buffered_symptoms": buffered_symptoms,
            }
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
