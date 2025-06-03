import os
import boto3
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de S3
try:
    s3 = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    )
    print("Cliente S3 creado exitosamente")
except Exception as e:
    print(f"Error al crear cliente S3: {str(e)}")
    raise

BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')
if not BUCKET_NAME:
    print("ADVERTENCIA: AWS_BUCKET_NAME no está configurado en las variables de entorno")
    BUCKET_NAME = "geocrypt-files"  # Valor por defecto para pruebas
    print(f"Usando bucket por defecto: {BUCKET_NAME}")

# Verificar acceso a S3
try:
    s3.head_bucket(Bucket=BUCKET_NAME)
    print(f"Acceso al bucket {BUCKET_NAME} verificado")
except Exception as e:
    print(f"Error al verificar acceso al bucket: {str(e)}")
    print("ADVERTENCIA: No se pudo verificar el acceso al bucket S3") 