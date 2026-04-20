from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import llm, triage, report, ocr, prescription, scribe

app = FastAPI(title="OPD Pre-Consult Python Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm.router)
app.include_router(triage.router)
app.include_router(report.router)
app.include_router(ocr.router)
app.include_router(prescription.router)
app.include_router(scribe.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
