import scispacy
from scispacy.linking import EntityLinker
import spacy

# T023, T029, T030: Body Part
# T184: Sign or Symptom
# T047: Disease or Syndrome
TARGET_TYPES = {"T023", "T029", "T030", "T184", "T047"}
TYPE_TO_BUCKET = {"T184": "symptom", "T047": "diseases", "T023": "body_type", "T029": "body_type", "T030": "body_type"}

try:
    nlp = spacy.load("en_core_sci_md")
    nlp.add_pipe("scispacy_linker", config={"resolve_abbreviations": True, "linker_name": "umls"})
except OSError:
    nlp = None

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
            if value not in seen[bucket]:
                result[bucket].append(value)
                seen[bucket].add(value)

    return result
