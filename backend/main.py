from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import transit

app = FastAPI(title="Pulse Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transit.router)


@app.get("/")
async def root():
    return {"message": "Pulse API is running"}
