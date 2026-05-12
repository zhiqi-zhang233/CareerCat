from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ALLOWED_ORIGINS
from app.routers import (
    profile,
    recommend,
    jobs,
    analysis,
    coach,
    job_discovery,
    agent,
    workflows,
    user,
)

app = FastAPI(title="CareerCat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(recommend.router)
app.include_router(jobs.router)
app.include_router(analysis.router)
app.include_router(coach.router)
app.include_router(job_discovery.router)
app.include_router(agent.router)
app.include_router(workflows.router)
app.include_router(user.router)

@app.get("/")
def read_root():
    return {"message": "CareerCat backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
