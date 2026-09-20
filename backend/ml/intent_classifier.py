import os
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

model = joblib.load(MODEL_PATH)


def classify_intent(text):
    if not text or not text.strip():
        return {
            "intent": "general_help",
            "confidence": 0.0
        }

    intent = model.predict([text])[0]

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        confidence = float(max(probabilities))
    else:
        confidence = 1.0

    return {
        "intent": intent,
        "confidence": confidence
    }