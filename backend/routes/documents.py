import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from backend.config import Config
import backend.schemas as schemas
import backend.hf_client as hf_client
from backend.routes.chats import extract_text_from_file

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Uploads a document, extracts its text, and returns access URLs and a short preview."""
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp"]
    if file_ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed formats: {', '.join(allowed_exts)}")
        
    unique_filename = f"doc_{uuid.uuid4()}{file_ext}"
    physical_path = os.path.join(Config.UPLOAD_DIR, unique_filename)
    
    with open(physical_path, "wb") as buffer:
        content_bytes = await file.read()
        buffer.write(content_bytes)
        
    # Extract the full text content of the document
    extracted_text = extract_text_from_file(physical_path)
    
    # Generate clean preview
    preview = extracted_text[:800]
    if len(extracted_text) > 800:
        preview += "\n\n[... Remaining text truncated for preview ...]"
        
    return {
        "document_url": f"/api/uploads/{unique_filename}",
        "file_path": physical_path,
        "filename": file.filename,
        "preview": preview,
        "text_length": len(extracted_text),
        "extracted_text": extracted_text
    }

@router.post("/query")
def query_document(req: schemas.QueryRequest):
    """Queries the document content to answer specific questions."""
    if not os.path.exists(req.document_path):
        raise HTTPException(status_code=404, detail="Reference document not found.")
        
    # Extract the text content
    extracted_text = extract_text_from_file(req.document_path)
    
    if not extracted_text.strip():
        return {"result": "The document seems to be empty or could not be parsed."}
        
    # Run the text Q&A engine
    answer = hf_client.query_text_model(req.question, context=extracted_text)
    return {"result": answer}
