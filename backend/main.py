from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import timedelta
import datetime
from fastapi.responses import FileResponse, Response
import boto3
from botocore.exceptions import ClientError
import logging
from dotenv import load_dotenv
import pyotp
from email_service import send_otp_email
from redis_service import redis_service

import models
import schemas
import auth
from database import engine, get_db

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()
logger.info("=== Verificando variables de entorno ===")
logger.info(f"AWS_ACCESS_KEY_ID presente: {'Sí' if os.getenv('AWS_ACCESS_KEY_ID') else 'No'}")
logger.info(f"AWS_SECRET_ACCESS_KEY presente: {'Sí' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'No'}")
logger.info(f"AWS_REGION presente: {'Sí' if os.getenv('AWS_REGION') else 'No'}")
logger.info(f"S3_BUCKET_NAME presente: {'Sí' if os.getenv('S3_BUCKET_NAME') else 'No'}")
logger.info("=====================================")

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

# Configurar S3
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

# Verificar variables de entorno de AWS
if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME]):
    logger.error("❌ Faltan variables de entorno necesarias para AWS S3")
    logger.error("Por favor, asegúrate de tener configuradas las siguientes variables en tu archivo .env:")
    logger.error("- AWS_ACCESS_KEY_ID")
    logger.error("- AWS_SECRET_ACCESS_KEY")
    logger.error("- S3_BUCKET_NAME")
    logger.error("- AWS_REGION (opcional, por defecto: us-east-1)")
else:
    # Configurar cliente S3
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )

# Verificar conexión con S3 al inicio
@app.on_event("startup")
async def startup_event():
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME]):
        logger.error("❌ No se puede verificar la conexión con S3: faltan variables de entorno")
        return

    try:
        # Intentar listar los objetos del bucket para verificar la conexión
        s3_client.list_objects_v2(Bucket=BUCKET_NAME, MaxKeys=1)
        logger.info("✅ Conexión exitosa con Amazon S3")
        logger.info(f"Bucket configurado: {BUCKET_NAME}")
        logger.info(f"Región AWS: {AWS_REGION}")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error("❌ Error al conectar con Amazon S3")
        logger.error(f"Código de error: {error_code}")
        logger.error(f"Mensaje de error: {error_message}")
        logger.error("Por favor, verifica tus credenciales de AWS y la configuración del bucket")
    except Exception as e:
        logger.error("❌ Error inesperado al conectar con Amazon S3")
        logger.error(f"Error: {str(e)}")

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
    geohash: str = Form(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    logger.info("=== INICIO DE SUBIDA DE ARCHIVO ===")
    try:
        # Crear directorio de uploads si no existe
        os.makedirs("uploads", exist_ok=True)
        
        # Generar nombre único para el archivo
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{current_user.id}_{timestamp}_{file.filename}"
        file_path = os.path.join("uploads", unique_filename)
        
        logger.info(f"Iniciando guardado del archivo...")
        # Guardar archivo localmente
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info("Archivo guardado exitosamente")
        
        # Subir a S3
        logger.info("Iniciando subida a S3...")
        s3_key = f"{current_user.id}/{unique_filename}"
        s3_client.upload_file(file_path, BUCKET_NAME, s3_key, ExtraArgs={'ContentType': file.content_type})
        logger.info(f"Archivo subido exitosamente a S3 en la ruta: {s3_key}")
        
        # Crear registro en la base de datos
        db_file = models.File(
            filename=file.filename,
            file_path=s3_key,
            user_id=current_user.id,
            geohash=geohash,
            is_encrypted=True
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        logger.info(f"Archivo registrado en la base de datos con ID: {db_file.id}")
        
        # Limpiar archivo local
        logger.info(f"Limpiando archivo: {file_path}")
        os.remove(file_path)
        
        logger.info("=== FIN DE SUBIDA DE ARCHIVO ===")
        return {"message": "File uploaded successfully", "file_id": db_file.id}
        
    except Exception as e:
        logger.error(f"Error al subir archivo: {str(e)}")
        logger.error(f"Tipo de error: {type(e)}")
        logger.error(f"Traceback completo: {traceback.format_exc()}")
        # Limpiar archivo local si existe
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

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
    file_id: int,
    geohash: str,
    otp: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    logger.info("=== INICIO DE SOLICITUD DE DESCARGA ===")
    logger.info(f"📁 ID del archivo: {file_id}")
    logger.info(f"👤 Usuario: {current_user.username}")
    logger.info(f"📍 Geohash recibido: {geohash}")
    logger.info(f"🔑 OTP recibido: {otp}")
    
    try:
        # Verificar que el archivo existe y pertenece al usuario
        db_file = db.query(models.File).filter(models.File.id == file_id).first()
        if not db_file:
            logger.error(f"❌ Archivo {file_id} no encontrado")
            raise HTTPException(status_code=404, detail="File not found")
        
        if db_file.user_id != current_user.id:
            logger.error(f"❌ Usuario {current_user.username} no tiene permiso para acceder al archivo {file_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this file")
        
        # Verificar OTP en Redis
        if not redis_service.verify_otp(file_id, otp):
            logger.error("❌ OTP inválido o expirado")
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
        
        logger.info("✅ OTP verificado correctamente")
        
        # Verificar geohash
        if db_file.geohash != geohash:
            logger.error(f"❌ Geohash inválido. Recibido: {geohash}, Esperado: {db_file.geohash}")
            raise HTTPException(status_code=401, detail="Invalid geohash")
        
        logger.info("✅ Geohash verificado correctamente")
        
        # Verificar archivo en S3
        logger.info("=== Búsqueda en S3 ===")
        logger.info(f"Buscando archivo en S3: {db_file.file_path}")
        logger.info(f"Bucket: {BUCKET_NAME}")
        
        try:
            logger.info("Intentando verificar existencia del archivo en S3...")
            s3_client.head_object(Bucket=BUCKET_NAME, Key=db_file.file_path)
            logger.info("✅ Archivo encontrado en S3")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"❌ Error al verificar archivo en S3:")
            logger.error(f"Código de error: {error_code}")
            logger.error(f"Mensaje de error: {error_message}")
            logger.error(f"❌ Archivo no encontrado en S3: {db_file.file_path}")
            raise HTTPException(status_code=404, detail=f"File not found in S3: {error_message}")
        
        # Generar URL firmada para descarga
        try:
            logger.info("Generando URL firmada para descarga...")
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': db_file.file_path,
                    'ResponseContentDisposition': f'attachment; filename="{db_file.filename}"'
                },
                ExpiresIn=3600  # URL válida por 1 hora
            )
            logger.info("✅ URL firmada generada exitosamente")
            
            return {
                "download_url": url,
                "filename": db_file.filename
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"❌ Error al generar URL firmada:")
            logger.error(f"Código de error: {error_code}")
            logger.error(f"Mensaje de error: {error_message}")
            raise HTTPException(status_code=500, detail=f"Error generating download URL: {error_message}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error inesperado: {str(e)}")
        logger.error(f"Traceback completo: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    finally:
        logger.info("=== FIN DE SOLICITUD DE DESCARGA ===")

@app.get("/files/{file_id}/otp")
async def get_file_otp(
    file_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    logger.info("="*50)
    logger.info(f"🚀 INICIO DE SOLICITUD DE OTP")
    logger.info(f"📁 ID del archivo: {file_id}")
    logger.info(f"👤 Usuario: {current_user.username}")
    logger.info(f"📧 Email del usuario: {current_user.email}")
    
    # Verificar que el archivo existe y pertenece al usuario
    logger.info("🔍 Verificando existencia del archivo...")
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        logger.error(f"❌ Archivo {file_id} no encontrado")
        raise HTTPException(status_code=404, detail="File not found")
    logger.info(f"✅ Archivo encontrado: {db_file.filename}")
    
    if db_file.user_id != current_user.id:
        logger.error(f"❌ Usuario {current_user.username} no tiene permiso para acceder al archivo {file_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this file")
    logger.info("✅ Permisos de usuario verificados")
    
    # Generar OTP
    logger.info("🔑 Generando código OTP...")
    totp = pyotp.TOTP(pyotp.random_base32())
    otp = totp.now()
    logger.info(f"✅ OTP generado: {otp}")
    
    # Almacenar OTP en Redis
    if not redis_service.store_otp(file_id, otp):
        logger.error("❌ Error al almacenar OTP en Redis")
        raise HTTPException(status_code=500, detail="Failed to store OTP")
    logger.info("✅ OTP almacenado en Redis")
    
    # Enviar OTP por email
    logger.info(f"📧 Iniciando envío de OTP por email a {current_user.email}")
    email_sent = send_otp_email(current_user.email, otp)
    
    if not email_sent:
        logger.error(f"❌ Falló el envío del email con el OTP a {current_user.email}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    logger.info(f"✅ OTP enviado exitosamente a {current_user.email}")
    logger.info("="*50)
    return {"message": "OTP sent to your email"}

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
