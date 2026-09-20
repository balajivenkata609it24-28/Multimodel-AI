from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Message schemas
class MessageBase(BaseModel):
    role: str
    content: str
    image_url: Optional[str] = None
    document_url: Optional[str] = None

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    chat_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ChatSession schemas
class ChatSessionBase(BaseModel):
    id: str
    title: str

class ChatSessionCreate(BaseModel):
    id: str
    title: str

class ChatSessionResponse(ChatSessionBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatSessionDetailResponse(ChatSessionResponse):
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# Setting schemas
class SettingBase(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

# Document Query schemas
class QueryRequest(BaseModel):
    question: str
    document_path: str
