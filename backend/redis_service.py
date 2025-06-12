import redis
import logging
from settings import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
import time

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client = None
        self.connect()

    def connect(self):
        try:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD if REDIS_PASSWORD else None,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Conexión a Redis establecida")
        except redis.ConnectionError as e:
            logger.error(f"❌ Error al conectar con Redis: {str(e)}")
            self.redis_client = None
        except Exception as e:
            logger.error(f"❌ Error inesperado al conectar con Redis: {str(e)}")
            self.redis_client = None

    def ensure_connection(self):
        if self.redis_client is None:
            self.connect()
        return self.redis_client is not None

    def store_otp(self, file_id: int, otp: str) -> bool:
        try:
            if not self.ensure_connection():
                logger.error("❌ No hay conexión con Redis")
                return False

            key = f"otp:{file_id}"
            # Almacenar OTP con expiración de 90 segundos
            self.redis_client.setex(key, 90, otp)
            logger.info(f"✅ OTP almacenado en Redis para archivo {file_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Error al almacenar OTP en Redis: {str(e)}")
            return False

    def verify_otp(self, file_id: int, otp: str) -> bool:
        try:
            if not self.ensure_connection():
                logger.error("❌ No hay conexión con Redis")
                return False

            key = f"otp:{file_id}"
            stored_otp = self.redis_client.get(key)
            
            if stored_otp is None:
                logger.error(f"❌ No se encontró OTP para archivo {file_id}")
                return False
            
            if stored_otp != otp:
                logger.error(f"❌ OTP inválido para archivo {file_id}")
                return False
            
            # Eliminar OTP después de verificación exitosa
            self.redis_client.delete(key)
            logger.info(f"✅ OTP verificado y eliminado para archivo {file_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Error al verificar OTP en Redis: {str(e)}")
            return False

# Instancia global del servicio Redis
redis_service = RedisService() 