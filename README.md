# Aplicación de Encriptación de Archivos con Geohash

Esta aplicación permite encriptar y desencriptar archivos usando la ubicación del dispositivo como clave de encriptación.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

- `backend/`: API REST con FastAPI y SQLite
- `frontend/`: Aplicación móvil con Expo

## Requisitos

### Backend
- Python 3.8+
- pip

### Frontend
- Node.js 14+
- npm o yarn
- Expo CLI

## Instalación

### Backend

1. Navega al directorio del backend:
```bash
cd backend
```

2. Crea un entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. Instala las dependencias:
```bash
pip install -r requirements.txt
```

4. Inicia el servidor:
```bash
uvicorn main:app --reload
```

El servidor estará disponible en `http://localhost:8000`

### Frontend

1. Navega al directorio del frontend:
```bash
cd frontend
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia la aplicación:
```bash
npm start
```

## Características

- Registro y autenticación de usuarios
- Subida de archivos con encriptación basada en geohash
- Listado de archivos del usuario
- Descarga y compartición de archivos
- Eliminación de archivos
- Interfaz de usuario intuitiva y moderna

## Seguridad

- Los archivos se encriptan usando la ubicación del dispositivo como clave
- Las contraseñas se almacenan de forma segura usando bcrypt
- Autenticación mediante JWT
- Validación de geohash para descargar archivos

## Tecnologías Utilizadas

### Backend
- FastAPI
- SQLite
- SQLAlchemy
- JWT
- bcrypt

### Frontend
- Expo
- React Navigation
- Expo Location
- Expo File System
- Expo Document Picker
- Expo Sharing
- Expo Crypto 