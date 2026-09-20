import os
import uuid
import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.config import Config
import backend.models as models
import backend.schemas as schemas
import backend.hf_client as hf_client

# ML Intent Classifier
from backend.ml.intent_classifier import classify_intent


router = APIRouter(prefix="/api/chats", tags=["chats"])


# ============================================================
# DOCUMENT TEXT EXTRACTION
# ============================================================

def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    try:
        if ext == ".txt":
            with open(
                file_path,
                "r",
                encoding="utf-8",
                errors="ignore"
            ) as f:
                text = f.read()

        elif ext == ".pdf":
            import pdfplumber

            with pdfplumber.open(file_path) as pdf:
                text = "\n".join(
                    [page.extract_text() or "" for page in pdf.pages]
                )

        elif ext == ".docx":
            import docx

            doc = docx.Document(file_path)
            text = "\n".join(
                [para.text for para in doc.paragraphs]
            )

        elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
            # OCR using Hugging Face Vision Language Model
            text = hf_client.query_huggingface_vlm(
                file_path,
                "extract text",
                "ocr"
            )

    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")

        text = (
            f"[Extraction Error]: Could not parse contents of "
            f"{os.path.basename(file_path)}."
        )

    return text


# ============================================================
# LIST ALL CHAT SESSIONS
# ============================================================

@router.get("", response_model=List[schemas.ChatSessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    """Retrieve all chat sessions sorted by updated time."""

    return (
        db.query(models.ChatSession)
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )


# ============================================================
# CREATE NEW CHAT SESSION
# ============================================================

@router.post("", response_model=schemas.ChatSessionResponse)
def create_session(
    session: schemas.ChatSessionCreate,
    db: Session = Depends(get_db)
):
    """Create a new chat session."""

    db_session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session.id)
        .first()
    )

    if db_session:
        return db_session

    try:
        new_session = models.ChatSession(
            id=session.id,
            title=session.title
        )

        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        return new_session

    except Exception:
        db.rollback()

        # Check if another request created the session
        db_session = (
            db.query(models.ChatSession)
            .filter(models.ChatSession.id == session.id)
            .first()
        )

        if db_session:
            return db_session

        raise HTTPException(
            status_code=500,
            detail="Database insertion error"
        )


# ============================================================
# GET SINGLE CHAT SESSION
# ============================================================

@router.get(
    "/{chat_id}",
    response_model=schemas.ChatSessionDetailResponse
)
def get_session(
    chat_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a specific chat session with its messages."""

    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == chat_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    return session


# ============================================================
# DELETE CHAT SESSION
# ============================================================

@router.delete("/{chat_id}")
def delete_session(
    chat_id: str,
    db: Session = Depends(get_db)
):
    """Delete a chat session."""

    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == chat_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    db.delete(session)
    db.commit()

    return {
        "message": "Session deleted successfully"
    }


# ============================================================
# SEND MESSAGE
# ============================================================

@router.post(
    "/{chat_id}/messages",
    response_model=List[schemas.MessageResponse]
)
async def send_message(
    chat_id: str,
    content: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Post a new user message and get the AI response.

    Flow:
    1. Check chat session
    2. Save uploaded file if present
    3. Store user message
    4. Detect user intent using ML classifier
    5. Send request to appropriate AI model
    6. Store AI response
    7. Return both messages
    """

    # ========================================================
    # CHECK CHAT SESSION
    # ========================================================

    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == chat_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    # ========================================================
    # FILE VARIABLES
    # ========================================================

    image_url = None
    document_url = None
    saved_file_path = None
    file_type = None

    # ========================================================
    # PROCESS UPLOADED FILE
    # ========================================================

    if file:

        file_ext = os.path.splitext(file.filename)[1].lower()

        unique_filename = f"{uuid.uuid4()}{file_ext}"

        saved_file_path = os.path.join(
            Config.UPLOAD_DIR,
            unique_filename
        )

        # Make sure upload directory exists
        os.makedirs(
            Config.UPLOAD_DIR,
            exist_ok=True
        )

        # Save uploaded file
        with open(saved_file_path, "wb") as buffer:

            content_bytes = await file.read()

            buffer.write(content_bytes)

        file_url = f"/api/uploads/{unique_filename}"

        # Image file
        if file_ext in [
            ".png",
            ".jpg",
            ".jpeg",
            ".webp"
        ]:
            image_url = file_url
            file_type = "image"

        # Document file
        else:
            document_url = file_url
            file_type = "document"

    # ========================================================
    # CREATE USER MESSAGE
    # ========================================================

    user_msg = models.Message(
        chat_id=chat_id,
        role="user",
        content=content,
        image_url=image_url,
        document_url=document_url
    )

    db.add(user_msg)

    # ========================================================
    # MACHINE LEARNING INTENT CLASSIFICATION
    # ========================================================

    try:

        intent_result = classify_intent(content)

        detected_intent = intent_result["intent"]

        intent_confidence = intent_result["confidence"]

        print(
            f"[ML INTENT] {detected_intent} "
            f"(confidence: {intent_confidence:.2f})"
        )

    except Exception as e:

        print(
            f"[ML ERROR] {type(e).__name__}: {e}"
        )

        detected_intent = "general_help"

        intent_confidence = 0.0

    # ========================================================
    # AI PROCESSING
    # ========================================================

    try:

        # ----------------------------------------------------
        # IMAGE + VISION LANGUAGE MODEL
        # ----------------------------------------------------

        if file_type == "image":

            print(
                f"[AI] Processing image with intent: "
                f"{detected_intent}"
            )

            ai_content = hf_client.query_huggingface_vlm(
                saved_file_path,
                content,
                action_type=detected_intent
            )

        # ----------------------------------------------------
        # DOCUMENT + TEXT MODEL
        # ----------------------------------------------------

        elif file_type == "document":

            print(
                f"[AI] Processing document with intent: "
                f"{detected_intent}"
            )

            doc_text = extract_text_from_file(
                saved_file_path
            )

            ai_content = hf_client.query_text_model(
                content,
                context=f"Document content:\n{doc_text}"
            )

        # ----------------------------------------------------
        # NORMAL TEXT CHAT
        # ----------------------------------------------------

        else:

            print(
                f"[AI] Processing text with intent: "
                f"{detected_intent}"
            )

            history = (
                db.query(models.Message)
                .filter(
                    models.Message.chat_id == chat_id
                )
                .order_by(
                    models.Message.created_at.asc()
                )
                .all()
            )

            context_text = ""

            for m in history[-10:]:

                context_text += (
                    f"{m.role}: {m.content}\n"
                )

            ai_content = hf_client.query_text_model(
                content,
                context=f"Conversation history:\n{context_text}"
            )

    # ========================================================
    # AI ERROR HANDLING
    # ========================================================

    except Exception as e:

        print(
            f"[AI ERROR] {type(e).__name__}: {e}"
        )

        ai_content = (
            "I'm temporarily unable to connect to "
            "the AI model. Please try again in a moment."
        )

    # ========================================================
    # CREATE AI MESSAGE
    # ========================================================

    ai_msg = models.Message(
        chat_id=chat_id,
        role="assistant",
        content=ai_content,
        image_url=None,
        document_url=None
    )

    db.add(ai_msg)

    # ========================================================
    # UPDATE CHAT SESSION
    # ========================================================

    session.updated_at = datetime.datetime.utcnow()

    if session.title in [
        "New Chat",
        "New Conversation"
    ]:

        session.title = (
            content[:30] + "..."
            if len(content) > 30
            else content
        )

    # ========================================================
    # SAVE DATABASE CHANGES
    # ========================================================

    db.commit()

    db.refresh(user_msg)
    db.refresh(ai_msg)

    # ========================================================
    # RETURN USER + AI MESSAGES
    # ========================================================

    return [
        user_msg,
        ai_msg
    ]