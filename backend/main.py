from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import transit, routes, geocode

app = FastAPI(title="Pulse Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transit.router)
app.include_router(routes.router)
app.include_router(geocode.router)


@app.get("/")
async def root():
    return {"message": "Pulse API is running"}
