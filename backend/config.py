import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

class Config:
    # Base paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
    
    # DB configuration
    # Can be SQLite: sqlite:///./vlm_assistant.db
    # Or MySQL: mysql+pymysql://username:password@localhost:3306/vlm_db
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vlm_assistant.db")
    
    # Hugging Face Settings
    HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
    
    # Default VLM model
    HF_MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-VL-7B-Instruct")
    
    # Standalone Model Configurations
    TEXT_MODEL = os.getenv("TEXT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_DIR, exist_ok=True)
