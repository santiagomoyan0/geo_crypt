import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from settings import EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_FROM
import logging
import sys

# Configurar logging con formato detallado
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('email_service.log')
    ]
)
logger = logging.getLogger(__name__)

def send_otp_email(email: str, otp: str):
    """
    Envía un email con el código OTP al usuario
    """
    try:
        logger.info("="*50)
        logger.info(f"🚀 INICIO DE ENVÍO DE EMAIL OTP")
        logger.info(f"📧 Destinatario: {email}")
        logger.info(f"🔑 OTP a enviar: {otp}")
        logger.info(f"📤 Remitente: {EMAIL_FROM}")
        logger.info(f"🌐 Servidor SMTP: {EMAIL_HOST}:{EMAIL_PORT}")
        
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = email
        msg['Subject'] = "Tu código OTP para GeoCrypt"

        body = f"""
        Hola,

        Tu código OTP para descargar el archivo es: {otp}

        Este código es válido por 5 minutos.

        Saludos,
        El equipo de GeoCrypt
        """

        msg.attach(MIMEText(body, 'plain'))
        logger.info("✅ Email preparado correctamente")

        logger.info(f"📧 Conectando al servidor SMTP {EMAIL_HOST}:{EMAIL_PORT}")
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        logger.info("✅ Conexión TLS establecida")

        logger.info("🔑 Iniciando autenticación SMTP")
        logger.info(f"👤 Usuario SMTP: {EMAIL_USERNAME}")
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        logger.info("✅ Autenticación SMTP exitosa")

        text = msg.as_string()
        logger.info("📤 Enviando email...")
        server.sendmail(EMAIL_FROM, email, text)
        logger.info("✅ Email enviado exitosamente")
        
        server.quit()
        logger.info("✅ Conexión SMTP cerrada")
        logger.info("="*50)
        
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error("❌ Error de autenticación SMTP")
        logger.error(f"Detalles: {str(e)}")
        logger.error("Verifica las credenciales SMTP en el archivo .env")
        return False
    except smtplib.SMTPException as e:
        logger.error("❌ Error SMTP")
        logger.error(f"Detalles: {str(e)}")
        return False
    except Exception as e:
        logger.error("❌ Error inesperado al enviar email")
        logger.error(f"Tipo de error: {type(e).__name__}")
        logger.error(f"Detalles: {str(e)}")
        logger.error("Stack trace:", exc_info=True)
        return False 