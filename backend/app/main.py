from fastapi import FastAPI
from app.routes.file_routes import router as file_router

app = FastAPI()

app.include_router(file_router)

@app.get("/")
def read_root():
    return {"message": "Bienvenido al API de Encriptación"}