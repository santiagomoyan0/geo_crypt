from sqlalchemy import create_engine, Boolean
from sqlalchemy.orm import sessionmaker
from database import Base, SQLALCHEMY_DATABASE_URL
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_database():
    try:
        # Crear engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        # Crear todas las tablas
        logger.info("Creando tablas...")
        Base.metadata.create_all(bind=engine)
        
        # Verificar si la columna is_active existe
        with engine.connect() as conn:
            result = conn.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in result]
            
            if 'is_active' not in columns:
                logger.info("Agregando columna is_active a la tabla users...")
                conn.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
                logger.info("Columna is_active agregada exitosamente")
            else:
                logger.info("La columna is_active ya existe")
        
        logger.info("✅ Base de datos actualizada exitosamente")
        
    except Exception as e:
        logger.error(f"❌ Error al actualizar la base de datos: {str(e)}")
        raise

if __name__ == "__main__":
    update_database() 