import os
from fastapi import UploadFile
from uuid import uuid4

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def save_encrypted_file(file: UploadFile) -> str:
    """
    Guarda el archivo en una carpeta local.
    """
    filename = f"{uuid4()}_{file.filename}"
    file_location = os.path.join(UPLOAD_DIR, filename)

    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)

    return file_location