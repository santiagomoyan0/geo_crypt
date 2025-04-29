from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from datetime import datetime
from typing import List
from cryptography.fernet import Fernet
import base64

router = APIRouter()

# Directory to store uploaded files
UPLOAD_DIR = "app/uploads"
# Directory to store encrypted files
ENCRYPTED_DIR = "app/encrypted"

# Generate a key for encryption/decryption
def generate_key():
    return Fernet.generate_key()

# Initialize encryption key
ENCRYPTION_KEY = generate_key()
fernet = Fernet(ENCRYPTION_KEY)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Create upload directory if it doesn't exist
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Generate a unique filename using timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file information
        file_size = os.path.getsize(file_path)
        file_info = {
            "filename": unique_filename,
            "original_name": file.filename,
            "size_bytes": file_size,
            "upload_time": timestamp,
            "file_path": file_path,
            "is_encrypted": False
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"File {file.filename} uploaded successfully",
                "file_info": file_info
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )
    finally:
        file.file.close()

@router.post("/encrypt/{filename}")
async def encrypt_file(filename: str):
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail=f"File {filename} not found"
            )
        
        # Create encrypted directory if it doesn't exist
        os.makedirs(ENCRYPTED_DIR, exist_ok=True)
        
        # Read the file
        with open(file_path, "rb") as file:
            original_data = file.read()
        
        # Encrypt the file
        encrypted_data = fernet.encrypt(original_data)
        
        # Save the encrypted file
        encrypted_filename = f"encrypted_{filename}"
        encrypted_path = os.path.join(ENCRYPTED_DIR, encrypted_filename)
        with open(encrypted_path, "wb") as file:
            file.write(encrypted_data)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"File {filename} encrypted successfully",
                "encrypted_file": encrypted_filename,
                "file_path": encrypted_path
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error encrypting file: {str(e)}"
        )

@router.post("/decrypt/{filename}")
async def decrypt_file(filename: str):
    try:
        encrypted_path = os.path.join(ENCRYPTED_DIR, filename)
        if not os.path.exists(encrypted_path):
            raise HTTPException(
                status_code=404,
                detail=f"Encrypted file {filename} not found"
            )
        
        # Read the encrypted file
        with open(encrypted_path, "rb") as file:
            encrypted_data = file.read()
        
        # Decrypt the file
        decrypted_data = fernet.decrypt(encrypted_data)
        
        # Save the decrypted file
        decrypted_filename = f"decrypted_{filename.replace('encrypted_', '')}"
        decrypted_path = os.path.join(UPLOAD_DIR, decrypted_filename)
        with open(decrypted_path, "wb") as file:
            file.write(decrypted_data)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"File {filename} decrypted successfully",
                "decrypted_file": decrypted_filename,
                "file_path": decrypted_path
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error decrypting file: {str(e)}"
        )

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    try:
        # Try to delete from upload directory
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return JSONResponse(
                status_code=200,
                content={"message": f"File {filename} deleted successfully"}
            )
        
        # Try to delete from encrypted directory
        encrypted_path = os.path.join(ENCRYPTED_DIR, filename)
        if os.path.exists(encrypted_path):
            os.remove(encrypted_path)
            return JSONResponse(
                status_code=200,
                content={"message": f"Encrypted file {filename} deleted successfully"}
            )
        
        raise HTTPException(
            status_code=404,
            detail=f"File {filename} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting file: {str(e)}"
        )

@router.get("/files")
async def list_files():
    try:
        # Create directories if they don't exist
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        os.makedirs(ENCRYPTED_DIR, exist_ok=True)
        
        # Get list of files from both directories
        files = []
        
        # List regular files
        for filename in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(file_path):
                file_info = {
                    "filename": filename,
                    "size_bytes": os.path.getsize(file_path),
                    "upload_time": datetime.fromtimestamp(os.path.getctime(file_path)).strftime("%Y%m%d_%H%M%S"),
                    "is_encrypted": False
                }
                files.append(file_info)
        
        # List encrypted files
        for filename in os.listdir(ENCRYPTED_DIR):
            file_path = os.path.join(ENCRYPTED_DIR, filename)
            if os.path.isfile(file_path):
                file_info = {
                    "filename": filename,
                    "size_bytes": os.path.getsize(file_path),
                    "upload_time": datetime.fromtimestamp(os.path.getctime(file_path)).strftime("%Y%m%d_%H%M%S"),
                    "is_encrypted": True
                }
                files.append(file_info)
        
        return JSONResponse(
            status_code=200,
            content={"files": files}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing files: {str(e)}"
        )

@router.get("/files/{filename}")
async def get_file_info(filename: str):
    try:
        # Check in upload directory
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            file_info = {
                "filename": filename,
                "size_bytes": os.path.getsize(file_path),
                "upload_time": datetime.fromtimestamp(os.path.getctime(file_path)).strftime("%Y%m%d_%H%M%S"),
                "file_path": file_path,
                "is_encrypted": False
            }
            return JSONResponse(
                status_code=200,
                content={"file_info": file_info}
            )
        
        # Check in encrypted directory
        encrypted_path = os.path.join(ENCRYPTED_DIR, filename)
        if os.path.exists(encrypted_path):
            file_info = {
                "filename": filename,
                "size_bytes": os.path.getsize(encrypted_path),
                "upload_time": datetime.fromtimestamp(os.path.getctime(encrypted_path)).strftime("%Y%m%d_%H%M%S"),
                "file_path": encrypted_path,
                "is_encrypted": True
            }
            return JSONResponse(
                status_code=200,
                content={"file_info": file_info}
            )
        
        raise HTTPException(
            status_code=404,
            detail=f"File {filename} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting file info: {str(e)}"
        ) 