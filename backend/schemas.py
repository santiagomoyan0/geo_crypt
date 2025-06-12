from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class FileBase(BaseModel):
    filename: str
    file_path: str
    geohash: str
    is_encrypted: bool

class FileCreate(FileBase):
    pass

class File(FileBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginCredentials(BaseModel):
    username: str
    password: str

class TokenData(BaseModel):
    username: Optional[str] = None 