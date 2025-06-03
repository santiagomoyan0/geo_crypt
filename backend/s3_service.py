import os
from config.settings import s3, BUCKET_NAME

class S3Service:
    @staticmethod
    async def upload_file(file_content: bytes, s3_key: str) -> bool:
        try:
            s3.put_object(
                Key=s3_key,
                Body=file_content
            )
            return True
        except Exception as e:
            print(f"Error al subir a S3: {str(e)}")
            return False

    @staticmethod
    async def download_file(s3_key: str) -> bytes:
        try:
            response = s3.get_object(Bucket=BUCKET_NAME, Key=s3_key)
            return response['Body'].read()
        except Exception as e:
            print(f"Error al descargar de S3: {str(e)}")
            raise

    @staticmethod
    async def delete_file(s3_key: str) -> bool:
        try:
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            return True
        except Exception as e:
            print(f"Error al eliminar de S3: {str(e)}")
            return False 