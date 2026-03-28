from flask import Blueprint, request, jsonify
import scispacy
from scispacy.abbreviation import AbbreviationDetector
import spacy
from scispacy.linking import EntityLinker

# T029: Body Part
# T184: Sign or Symptom
# T047: Disease or Syndrome
TARGET_TYPES = {"T029", "T184", "T047"}
TYPE_TO_BUCKET = {"T184": "symptom", "T047": "diseases", "T029": "body_type"}

# Load the scispacy model
try:
    nlp = spacy.load("en_core_sci_sm")
    nlp.add_pipe("scispacy_linker", config={"resolve_abbreviations": True, "linker_name": "umls"})
except OSError:
    nlp = None

scispacy_bp = Blueprint("scispacy", __name__)


def _model_not_loaded_response():
    return (
        jsonify(
            {
                "error": (
                    "scispacy model not loaded. Install with: "
                    "pip install scispacy && "
                    "pip install "
                    "https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.1/"
                    "en_core_sci_lg-0.5.1.tar.gz"
                ),
                "success": False,
            }
        ),
        500,
    )


def analyze_text(text: str):
    doc = nlp(text)
    linker = nlp.get_pipe("scispacy_linker")

    entities = []
    diagnosis_seed = {"symptom": [], "diseases": [], "body_type": []}
    seen_seed = {key: set() for key in diagnosis_seed.keys()}

    for ent in doc.ents:
        umls_matches = []
        picked_types = set()

        for cui, score in ent._.kb_ents[:5]:
            concept = linker.kb.cui_to_entity[cui]
            matched_types = [t for t in concept.types if t in TARGET_TYPES]
            if not matched_types:
                continue

            picked_types.update(matched_types)
            umls_matches.append(
                {
                    "cui": cui,
                    "name": concept.canonical_name,
                    "types": matched_types,
                    "score": round(score, 3),
                }
            )

            for t in matched_types:
                bucket = TYPE_TO_BUCKET[t]
                value = concept.canonical_name
                if value not in seen_seed[bucket]:
                    diagnosis_seed[bucket].append(value)
                    seen_seed[bucket].add(value)

        if umls_matches:
            entities.append(
                {
                    "text": ent.text,
                    "label": "ENTITY",
                    "selected_types": sorted(picked_types),
                    "umls_matches": umls_matches,
                }
            )

    return {
        "entities": entities,
        "sentences": [sent.text for sent in doc.sents],
        "result": diagnosis_seed,
    }

@scispacy_bp.route("/api/diagnose", methods=["POST"])
def diagnose_text():
    if nlp is None:
        return _model_not_loaded_response()

    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "").strip()
    session_id = payload.get("session_id", "default-session")
    is_final = bool(payload.get("final", True))

    if not text:
        return jsonify({"success": False, "error": "text is required"}), 400

    try:
        analyzed = analyze_text(text)
        response = {
            "success": True,
            "session_id": session_id,
            "final": is_final,
            "processed_text": text,
            "entities": analyzed["entities"],
            "result": analyzed["result"],
        }
        print(f"[diagnose] session={session_id} final={is_final} text='{text}'")
        print(f"[diagnose] result={response['result']}")
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}", "success": False}), 500
