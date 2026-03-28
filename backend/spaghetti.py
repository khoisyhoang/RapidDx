from flask import Blueprint, request, jsonify
import scispacy
from scispacy.abbreviation import AbbreviationDetector
import spacy
from scispacy.linking import EntityLinker

# Load the scispacy model
try:
    nlp = spacy.load("en_core_sci_sm")
    nlp.add_pipe("scispacy_linker", config={"resolve_abbreviations": True, "linker_name": "umls"})
except OSError:
    nlp = None

scispacy_bp = Blueprint('scispacy', __name__)

@scispacy_bp.route('/api/scispacy/process', methods=['GET'])
def process_text():
    """
    Process biomedical text using scispacy for entity recognition.
    Uses hardcoded test text.
    Returns: {"entities": [{"text": "...", "start": 0, "end": 10, "label": "..."}], "sentences": [...], "success": true}
    """
    if nlp is None:
        return jsonify({"error": "scispacy model not loaded. Install with: pip install scispacy && pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.1/en_core_sci_lg-0.5.1.tar.gz", "success": False}), 500

    text = "I feel hot in my chest and coughing all day, maybe im in love. I dont know what to do. I feel dizzy. I feel tired."

    try:
        doc = nlp(text)
        entities = []
        linker = nlp.get_pipe("scispacy_linker")

        for ent in doc.ents:
            entity_info = {
                "text": ent.text,
                "label": "ENTITY",
                "umls_matches": []
            }
            for cui, score in ent._.kb_ents[:3]:  # top 3 matches
                concept = linker.kb.cui_to_entity[cui]
                print(concept)
                entity_info["umls_matches"].append({
                    "cui": cui,
                    "name": concept.canonical_name,
                    "types": concept.types,
                    "score": round(score, 2)
                })
            entities.append(entity_info)
        sentences = [sent.text for sent in doc.sents]

        return jsonify({
            "entities": entities,
            "sentences": sentences,
            "success": True,
            "processed_text": text
        })

    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}", "success": False}), 500
