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
import boto3
from botocore.exceptions import ClientError
import logging
from dotenv import load_dotenv
import pyotp

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
    print("=== INICIO DE SUBIDA DE ARCHIVO ===")
    print(f"Usuario: {current_user.username}")
    print(f"Nombre del archivo: {file.filename}")
    print(f"Tipo de contenido: {file.content_type}")
    print(f"Geohash recibido: {geohash}")
    
    try:
        # Generar secreto OTP único para este archivo
        otp_secret = pyotp.random_base32()
        
        # Asegurarse de que el directorio existe
        if not os.path.exists(UPLOAD_DIR):
            print(f"Creando directorio {UPLOAD_DIR}")
            os.makedirs(UPLOAD_DIR)
        
        # Crear un nombre de archivo único
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{current_user.id}_{timestamp}_{file.filename}"
        file_location = os.path.join(UPLOAD_DIR, safe_filename)
        print(f"Ubicación del archivo: {file_location}")
        
        # Guardar el archivo localmente
        print("Iniciando guardado del archivo...")
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        print("Archivo guardado exitosamente")
        
        # Subir el archivo a S3
        try:
            print("Iniciando subida a S3...")
            # Crear la ruta en S3 usando solo el ID del usuario
            s3_key = f"{current_user.id}/{safe_filename}"
            
            s3_client.upload_file(
                file_location,
                BUCKET_NAME,
                s3_key,
                ExtraArgs={'ContentType': file.content_type}
            )
            print(f"Archivo subido exitosamente a S3 en la ruta: {s3_key}")
        except Exception as s3_error:
            print(f"Error al subir a S3: {str(s3_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error uploading file to S3: {str(s3_error)}"
            )
        
        # Crear el registro en la base de datos
        db_file = models.File(
            filename=safe_filename,
            mimetype=file.content_type,
            size=os.path.getsize(file_location),
            geohash=geohash,
            otp_secret=otp_secret,
            user_id=current_user.id
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        print(f"Registro creado con ID: {db_file.id}")
        
        # Limpiar el archivo local después de subirlo a S3
        os.remove(file_location)
        print("Archivo local eliminado")
        
        response = {
            "status": "success",
            "message": "File uploaded successfully to S3",
            "file": {
                "id": db_file.id,
                "filename": db_file.filename,
                "size": db_file.size,
                "geohash": db_file.geohash,
                "s3_path": s3_key
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
    file_id: int,
    geohash: str,
    otp: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print(f"\n=== DESCARGAR ARCHIVO {file_id} ===")
    print(f"Usuario: {current_user.username}")
    print(f"Geohash proporcionado: {geohash}")
    print(f"OTP proporcionado: {otp}")
    
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id
    ).first()
    
    if not file:
        print(f"Error: Archivo {file_id} no encontrado en la base de datos")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verificar OTP
    totp = pyotp.TOTP(file.otp_secret, interval=90)
    if not totp.verify(otp):
        print(f"Error: OTP inválido para archivo {file_id}")
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Verificar geohash
    if file.geohash != geohash:
        print(f"Error: Geohash inválido. Esperado: {file.geohash}, Recibido: {geohash}")
        raise HTTPException(status_code=403, detail="Invalid geohash")
    
    try:
        # Construir la ruta del archivo en S3
        s3_key = f"{current_user.id}/{file.filename}"
        print(f"\n=== Búsqueda en S3 ===")
        print(f"Buscando archivo en S3: {s3_key}")
        print(f"Bucket: {BUCKET_NAME}")
        
        # Verificar si el archivo existe en S3
        try:
            print("Intentando verificar existencia del archivo en S3...")
            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
            print(f"✅ Archivo encontrado en S3: {s3_key}")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            print(f"❌ Error al verificar archivo en S3:")
            print(f"Código de error: {error_code}")
            print(f"Mensaje de error: {error_message}")
            if error_code == '404':
                print(f"❌ Archivo no encontrado en S3: {s3_key}")
                raise HTTPException(status_code=404, detail="File not found in S3")
            else:
                print(f"❌ Error al verificar archivo en S3: {error_code}")
                raise HTTPException(status_code=500, detail=f"Error checking file in S3: {error_code}")
        
        # Generar una URL firmada para descargar el archivo
        print("\n=== Generando URL de descarga ===")
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=3600  # URL válida por 1 hora
        )
        
        print(f"✅ URL de descarga generada exitosamente")
        return {"download_url": url}
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"\n❌ Error al acceder al archivo en S3:")
        print(f"Código de error: {error_code}")
        print(f"Mensaje de error: {error_message}")
        raise HTTPException(
            status_code=500,
            detail=f"Error accessing file in S3: {error_message}"
        )
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")
        import traceback
        print(f"Traceback completo: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/files/{file_id}/otp")
async def get_file_otp(
    file_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print(f"\n{'='*50}")
    print(f"=== SOLICITUD DE OTP PARA ARCHIVO {file_id} ===")
    print(f"Usuario: {current_user.username}")
    
    # Verificar si el archivo existe
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id
    ).first()
    
    if not file:
        print(f"Error: Archivo {file_id} no encontrado para el usuario {current_user.username}")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"Archivo encontrado: {file.filename}")
    print(f"Geohash: {file.geohash}")
    
    totp = pyotp.TOTP(file.otp_secret, interval=90)
    otp = totp.now()
    
    print(f"\n{'='*50}")
    print(f"OTP GENERADO: {otp}")
    print(f"Este código es válido por 1.5 minutos")
    print(f"{'='*50}\n")
    
    return {"otp": otp}

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
