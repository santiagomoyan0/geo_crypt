from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import timedelta
import datetime
from fastapi.responses import FileResponse

import models
import schemas
import auth
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="GeoHash File API")

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear directorio para archivos si no existe
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.get("/", tags=["Test"])
async def root():
    print("=== ROOT ENDPOINT ===")
    response = {
        "status": "success",
        "message": "¡Hola Mundo! La API está funcionando correctamente.",
        "version": "1.0.0"
    }
    print(f"Respuesta: {response}")
    return response

@app.get("/health", tags=["Test"])
async def health_check():
    print("=== HEALTH CHECK ===")
    response = {
        "status": "healthy",
        "timestamp": str(datetime.datetime.now())
    }
    print(f"Respuesta: {response}")
    return response

@app.post("/auth/register", response_model=schemas.Token)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    print("=== REGISTRO DE USUARIO ===")
    print(f"Intento de registro para usuario: {user.username}")
    
    db_user = auth.get_user(db, username=user.username)
    if db_user:
        print(f"Error: Usuario {user.username} ya existe")
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    print(f"Usuario {user.username} registrado exitosamente")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    response = {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }
    print(f"Token generado para usuario {user.username}")
    return response

@app.post("/auth/login", response_model=schemas.Token)
async def login_for_access_token(
    credentials: schemas.LoginCredentials,
    db: Session = Depends(get_db)
):
    print("=== LOGIN DE USUARIO ===")
    print(f"Intento de login para usuario: {credentials.username}")
    
    user = auth.authenticate_user(db, credentials.username, credentials.password)
    if not user:
        print(f"Error: Credenciales inválidas para usuario {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    print(f"Login exitoso para usuario {user.username}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    print("=== OBTENER USUARIO ACTUAL ===")
    print(f"Obteniendo información para usuario: {current_user.username}")
    return current_user

@app.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    geohash: str = Form(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print("=== INICIO DE SUBIDA DE ARCHIVO ===")
    print(f"Usuario: {current_user.username}")
    print(f"Nombre del archivo: {file.filename}")
    print(f"Tipo de contenido: {file.content_type}")
    print(f"Geohash recibido: {geohash}")
    
    try:
        # Asegurarse de que el directorio existe
        if not os.path.exists(UPLOAD_DIR):
            print(f"Creando directorio {UPLOAD_DIR}")
            os.makedirs(UPLOAD_DIR)
        
        # Crear un nombre de archivo único
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{current_user.id}_{timestamp}_{file.filename}"
        file_location = os.path.join(UPLOAD_DIR, safe_filename)
        print(f"Ubicación del archivo: {file_location}")
        
        # Guardar el archivo
        print("Iniciando guardado del archivo...")
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        print("Archivo guardado exitosamente")
        
        # Crear el registro en la base de datos con el mismo nombre de archivo
        db_file = models.File(
            filename=safe_filename,  # Usamos el mismo nombre que el archivo físico
            mimetype=file.content_type,
            size=os.path.getsize(file_location),
            geohash=geohash,
            user_id=current_user.id
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        print(f"Registro creado con ID: {db_file.id}")
        
        response = {
            "status": "success",
            "message": "File uploaded successfully",
            "file": {
                "id": db_file.id,
                "filename": db_file.filename,
                "size": db_file.size,
                "geohash": db_file.geohash
            }
        }
        print(f"Respuesta: {response}")
        return response
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        print(f"Traceback completo: {traceback.format_exc()}")
        
        # Si algo falla, intentar limpiar
        if os.path.exists(file_location):
            print(f"Limpiando archivo: {file_location}")
            os.remove(file_location)
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )
    finally:
        print("=== FIN DE SUBIDA DE ARCHIVO ===")

@app.get("/files", response_model=List[schemas.File])
async def list_files(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print("=== LISTAR ARCHIVOS ===")
    print(f"Listando archivos para usuario: {current_user.username}")
    files = db.query(models.File).filter(models.File.user_id == current_user.id).all()
    print(f"Archivos encontrados: {len(files)}")
    return files

@app.get("/files/{file_id}", response_model=schemas.File)
async def get_file(
    file_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print(f"=== OBTENER ARCHIVO {file_id} ===")
    print(f"Usuario: {current_user.username}")
    
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id
    ).first()
    
    if not file:
        print(f"Error: Archivo {file_id} no encontrado")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"Archivo encontrado: {file.filename}")
    return file

@app.get("/files/{file_id}/download")
async def download_file(
    request: Request,
    file_id: int,
    geohash: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print(f"=== DESCARGAR ARCHIVO {file_id} ===")
    print(f"Usuario: {current_user.username}")
    print(f"Geohash proporcionado: {geohash}")
    print(f"URL de la petición: {request.url}")
    
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id
    ).first()
    
    if not file:
        print(f"Error: Archivo {file_id} no encontrado")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"Geohash almacenado: {file.geohash}")
    if file.geohash != geohash:
        print(f"Error: Geohash inválido. Esperado: {file.geohash}, Recibido: {geohash}")
        raise HTTPException(status_code=403, detail="Invalid geohash")
    
    # Usar el nombre exacto del archivo de la base de datos
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    print(f"Buscando archivo en: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"Error: Archivo físico no encontrado en {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"Archivo encontrado en: {file_path}")
    return FileResponse(
        path=file_path,
        filename=file.filename,
        media_type=file.mimetype
    )

@app.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print(f"=== ELIMINAR ARCHIVO {file_id} ===")
    print(f"Usuario: {current_user.username}")
    
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id
    ).first()
    
    if not file:
        print(f"Error: Archivo {file_id} no encontrado")
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = f"{UPLOAD_DIR}/{current_user.id}_{file.filename}"
    if os.path.exists(file_path):
        print(f"Eliminando archivo físico: {file_path}")
        os.remove(file_path)
    
    print(f"Eliminando registro de la base de datos para archivo {file_id}")
    db.delete(file)
    db.commit()
    
    print("Archivo eliminado exitosamente")
    return {"message": "File deleted successfully"} 
