from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import joblib

app = FastAPI(title="StrokeShield AI Backend")

# Enable Cross-Origin Resource Sharing for flawless communication with Vite/React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load machine learning pipeline assets
try:
    model = joblib.load("stroke_model.pkl")
    scaler = joblib.load("scaler.pkl")
    encoders = joblib.load("encoders.pkl")
    print("All AI pipeline models, scalers, and encoders loaded successfully.")
except Exception as e:
    print(f"Error loading AI pipeline model files: {e}")
    model = None
    scaler = None
    encoders = None

class PatientData(BaseModel):
    age: int = Field(..., ge=1, le=120)
    gender: str
    chest_pain: int = Field(..., ge=0, le=1)
    high_blood_pressure: int = Field(..., ge=0, le=1)
    irregular_heartbeat: int = Field(..., ge=0, le=1)
    shortness_of_breath: int = Field(..., ge=0, le=1)
    fatigue_weakness: int = Field(..., ge=0, le=1)
    dizziness: int = Field(..., ge=0, le=1)
    swelling_edema: int = Field(..., ge=0, le=1)
    neck_jaw_pain: int = Field(..., ge=0, le=1)
    excessive_sweating: int = Field(..., ge=0, le=1)
    persistent_cough: int = Field(..., ge=0, le=1)
    nausea_vomiting: int = Field(..., ge=0, le=1)
    chest_discomfort: int = Field(..., ge=0, le=1)
    cold_hands_feet: int = Field(..., ge=0, le=1)
    snoring_sleep_apnea: int = Field(..., ge=0, le=1)
    anxiety_doom: int = Field(..., ge=0, le=1)

@app.get("/")
def home():
    return {"message": "StrokeShield Backend Running"}

@app.post("/api/predict")
async def predict_stroke(data: PatientData):
    try:
        # Safety normalization: Enforces title casing (e.g., 'male' becomes 'Male')
        normalized_gender = data.gender.strip().title()

        # Dynamic validation checking if the loaded encoder matches features data structures
        if encoders is not None and "gender" in encoders:
            gender_val = int(encoders["gender"].transform([normalized_gender])[0])
        else:
            gender_val = 1 if normalized_gender == "Male" else 0

        # Maintain exact structural alignment matching X training metrics dataset columns
        features = [
            data.age, gender_val, data.chest_pain, data.high_blood_pressure,
            data.irregular_heartbeat, data.shortness_of_breath, data.fatigue_weakness,
            data.dizziness, data.swelling_edema, data.neck_jaw_pain, data.excessive_sweating,
            data.persistent_cough, data.nausea_vomiting, data.chest_discomfort,
            data.cold_hands_feet, data.snoring_sleep_apnea, data.anxiety_doom
        ]

        if model is not None and scaler is not None:
            scaled_features = scaler.transform(np.array([features]))
            probability = float(model.predict_proba(scaled_features)[0][1]) * 100
            prediction = 1 if probability >= 50 else 0
        else:
            # Matches your exact mathematical backup logic values
            probability = min(
                (
                    data.age * 0.25
                    + data.high_blood_pressure * 15
                    + data.irregular_heartbeat * 14
                    + data.chest_pain * 12
                    + data.shortness_of_breath * 10
                    + data.dizziness * 8
                    + data.fatigue_weakness * 7
                    + data.snoring_sleep_apnea * 6
                    + data.anxiety_doom * 4
                ),
                100
            )
            prediction = 1 if probability >= 50 else 0

        # Matches your exact risk categories and clinical advice array
        if probability >= 75:
            risk_level = "High Risk (উচ্চ ঝুঁকি)"
            suggestions = [
                "🚨 Consult a medical specialist immediately.",
                "🩺 Monitor blood pressure regularly.",
                "🥗 Avoid oily and salty foods.",
                "🚭 Stop smoking.",
                "🏃 Maintain light exercise."
            ]
        elif probability >= 40:
            risk_level = "Medium Risk (মাঝারি ঝুঁকি)"
            suggestions = [
                "⚠️ Routine cardiovascular checkup recommended.",
                "🥦 Improve food habits.",
                "💧 Maintain hydration.",
                "🚶 Daily walking recommended."
            ]
        else:
            risk_level = "Low Risk (কম ঝুঁকি)"
            suggestions = [
                "✅ Continue healthy habits.",
                "🥬 Eat vegetables regularly.",
                "💤 Maintain proper sleep.",
                "🏃 Continue exercise."
            ]

        return {
            "risk_category": risk_level,
            "probability": round(probability, 2),
            "binary_prediction": prediction,
            "clinical_recommendations": suggestions
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
