import os
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from backend.config import Config
from backend.database import engine, Base, get_db
import backend.models as models
import backend.schemas as schemas

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

# Seed database with default chat demo session
from backend.database import SessionLocal
import backend.models as models
db = SessionLocal()
try:
    if not db.query(models.ChatSession).filter(models.ChatSession.id == "chat_demo_session").first():
        demo_session = models.ChatSession(id="chat_demo_session", title="What is in this image?")
        db.add(demo_session)
        
        user_msg = models.Message(
            chat_id="chat_demo_session",
            role="user",
            content="What is in this image?",
            image_url="/api/uploads/dog.png"
        )
        db.add(user_msg)
        
        assistant_msg = models.Message(
            chat_id="chat_demo_session",
            role="assistant",
            content="The image shows a golden retriever dog sitting on the grass in a park. The dog has fluffy golden fur, a warm expression, and its tongue is slightly out. There are trees and sunlight in the background."
        )
        db.add(assistant_msg)
        db.commit()
except Exception as e:
    print(f"Error seeding database: {e}")
    db.rollback()
finally:
    db.close()

app = FastAPI(title="Multimodal VLM Assistant API", version="1.0.0")

# Setup CORS middleware
origins = [
    "http://localhost:5173",  # React + Vite default
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # standard React port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files statically
app.mount("/api/uploads", StaticFiles(directory=Config.UPLOAD_DIR), name="uploads")

# Include Routers
from backend.routes.chats import router as chats_router
from backend.routes.analysis import router as analysis_router
from backend.routes.documents import router as documents_router

app.include_router(chats_router)
app.include_router(analysis_router)
app.include_router(documents_router)

# Basic settings CRUD endpoints
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    """Retrieve app settings. Returns a structured JSON dictionary of all preferences."""
    settings_db = db.query(models.AppSetting).all()
    settings_dict = {s.key: s.value for s in settings_db}
    
    # Define default settings if not stored yet
    defaults = {
        "theme": "dark",
        "primaryColor": "blue",
        "model": "Qwen/Qwen2.5-VL-7B-Instruct",
        "responseLength": "medium",
        "saveChatHistory": "true",
        "autoDescribeImages": "false",
        "enableVoiceInput": "true",
        "enableVoiceOutput": "false"
    }
    
    # Merge defaults with stored values
    for k, v in defaults.items():
        if k not in settings_dict:
            settings_dict[k] = v
            
    return settings_dict

@app.post("/api/settings")
def update_settings(settings_update: dict, db: Session = Depends(get_db)):
    """Updates settings keys in the database."""
    for key, value in settings_update.items():
        # Clean value to string
        val_str = str(value)
        db_setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
        if db_setting:
            db_setting.value = val_str
        else:
            db_setting = models.AppSetting(key=key, value=val_str)
            db.add(db_setting)
            
    db.commit()
    return {"message": "Settings updated successfully"}

@app.get("/api/health")
def health_check():
    """Simple API check endpoint."""
    return {
        "status": "healthy",
        "database": Config.DATABASE_URL.split("///")[-1].split("@")[-1],  # redact passwords
        "huggingface": "Configured" if Config.HF_API_TOKEN else "Using Fallback Simulation"
    }

if __name__ == "__main__":
    import uvicorn
    # When running manually
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
