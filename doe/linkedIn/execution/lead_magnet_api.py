import os
import re

import modal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Modal app definition ───────────────────────────────────────────────────────

image = (
    modal.Image.debian_slim()
    .pip_install("supabase", "fastapi", "python-dotenv", "python-multipart")
)

app = modal.App("lead-magnet-api", image=image)

# ── FastAPI app ────────────────────────────────────────────────────────────────

web_app = FastAPI(title="Lead Magnet API")

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your Netlify domain after go-live
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ── Request model ──────────────────────────────────────────────────────────────

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class LeadSubmission(BaseModel):
    first_name: str
    last_name: str
    email: str


# ── Endpoint ───────────────────────────────────────────────────────────────────

@web_app.post("/submit")
async def submit(lead: LeadSubmission):
    first_name = lead.first_name.strip()
    last_name  = lead.last_name.strip()
    email      = lead.email.strip().lower()

    if not first_name or not last_name or not email:
        raise HTTPException(status_code=422, detail="All fields are required.")

    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Invalid email address.")

    # ── Insert lead ────────────────────────────────────────────────────────────
    try:
        from insert_lead_supabase import insert_lead
        insert_lead(first_name, last_name, email)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Database error. Please try again.") from exc

    # ── Send email ─────────────────────────────────────────────────────────────
    drive_links_raw = os.environ.get("LEAD_MAGNET_DRIVE_LINKS", "").strip()
    if not drive_links_raw:
        raise HTTPException(status_code=500, detail="Lead magnet links not configured.")

    drive_links = [link.strip() for link in drive_links_raw.split() if link.strip()]

    try:
        from send_lead_magnet_email import send_lead_magnet_email
        send_lead_magnet_email(first_name, last_name, email, drive_links)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Email delivery failed. Please try again.") from exc

    return {"status": "ok"}


# ── Modal ASGI mount ───────────────────────────────────────────────────────────

@app.function(secrets=[modal.Secret.from_dotenv()])
@modal.asgi_app()
def fastapi_app():
    return web_app
