from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.endpoints import router as api_router

load_dotenv()

app = FastAPI(title="Master Yoda & Ragebaiter Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # No cookies/sessions are used; wildcard origin + credentials is an invalid
    # (and risky) combination, so credentials stay off.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
