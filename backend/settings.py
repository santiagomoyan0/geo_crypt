import os
import boto3
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de Redis
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

# Configuración de Email
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USERNAME = os.getenv('EMAIL_USERNAME')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM')

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

BUCKET_NAME = os.getenv('AWS_BUCKET_NAME', 'geocrypt')
if not BUCKET_NAME:
    print("ADVERTENCIA: AWS_BUCKET_NAME no está configurado en las variables de entorno")
    print(f"Usando bucket por defecto: {BUCKET_NAME}")

# Verificar acceso a S3
try:
    s3.head_bucket(Bucket=BUCKET_NAME)
    print(f"Acceso al bucket {BUCKET_NAME} verificado")
except Exception as e:
    print(f"Error al verificar acceso al bucket: {str(e)}")
    print("ADVERTENCIA: No se pudo verificar el acceso al bucket S3") 