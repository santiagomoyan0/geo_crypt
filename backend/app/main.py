from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from app.routes.file_routes import router as file_router

app = FastAPI(title="Geo Crypt API", 
             description="API for secure file encryption and storage",
             version="1.0.0")

app.include_router(file_router, prefix="/api", tags=["files"])

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Bienvenido al API de Encriptación"}

@app.get("/upload-form", tags=["files"])
def form():
    html_content = """
    <html>
        <body>
            <h2>Subir archivo</h2>
            <form action="/api/upload" enctype="multipart/form-data" method="post">
                <input name="file" type="file">
                <input type="submit">
            </form>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)