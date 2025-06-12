import boto3
import logging
from botocore.exceptions import ClientError
from settings import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME

logger = logging.getLogger(__name__)

# Crear cliente S3
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def upload_file(file_path: str, s3_key: str) -> bool:
    """
    Sube un archivo a S3
    """
    try:
        s3_client.upload_file(file_path, AWS_BUCKET_NAME, s3_key)
        logger.info(f"✅ Archivo subido exitosamente a S3: {s3_key}")
        return True
    except ClientError as e:
        logger.error(f"❌ Error al subir archivo a S3: {str(e)}")
        return False

def download_file(s3_key: str, local_path: str) -> bool:
    """
    Descarga un archivo de S3
    """
    try:
        s3_client.download_file(AWS_BUCKET_NAME, s3_key, local_path)
        logger.info(f"✅ Archivo descargado exitosamente de S3: {s3_key}")
        return True
    except ClientError as e:
        logger.error(f"❌ Error al descargar archivo de S3: {str(e)}")
        return False

def delete_file(s3_key: str) -> bool:
    """
    Elimina un archivo de S3
    """
    try:
        s3_client.delete_object(Bucket=AWS_BUCKET_NAME, Key=s3_key)
        logger.info(f"✅ Archivo eliminado exitosamente de S3: {s3_key}")
        return True
    except ClientError as e:
        logger.error(f"❌ Error al eliminar archivo de S3: {str(e)}")
        return False 