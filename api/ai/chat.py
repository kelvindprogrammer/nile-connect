"""
Nile Connect – AI Career Mentor Chat
Vercel Python serverless function → POST /api/ai/chat

Core AI logic extracted from the original CV Reviewer Demo.
Custom UI layer stripped; CORS + dynamic profile injection added.
"""

import json
import os
from http.server import BaseHTTPRequestHandler

from groq import Groq

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"      # Groq-hosted model (robust fallback)
MODEL_PREFERRED = "openai/gpt-oss-20b" # Original model – kept if available

# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------


def _profile_block(profile: dict) -> str:
    """Build a natural-language context string from a dynamic student profile."""
    if not profile:
        return "No specific student profile provided – give general career advice."

    lines = ["Student Profile:"]
    if v := profile.get("full_name"):
        lines.append(f"- Name: {v}")
    if v := profile.get("student_id"):
        lines.append(f"- ID: {v}")
    if v := profile.get("department") or profile.get("major"):
        lines.append(f"- Department/Major: {v}")
    if v := profile.get("level"):
        lines.append(f"- Level: {v}")
    if v := profile.get("cgpa"):
        lines.append(f"- CGPA: {v}")
    if v := profile.get("graduation_year"):
        lines.append(f"- Graduation Year: {v}")
    if v := profile.get("technical_skills"):
        skills = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Technical Skills: {skills}")
    if v := profile.get("soft_skills"):
        skills = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Soft Skills: {skills}")
    if v := profile.get("certifications"):
        certs = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Certifications: {certs}")
    if v := profile.get("career_interests"):
        interests = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Career Interests: {interests}")
    if v := profile.get("preferred_location"):
        locs = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Preferred Location: {locs}")

    return "\n".join(lines)


def _system_prompt(profile: dict) -> str:
    return (
        "You are the Nile University AI Career Mentor. You are professional, "
        "encouraging, and deeply knowledgeable about the Nigerian job market "
        "(including NYSC, top firms in Lagos/Abuja, and remote tech opportunities). "
        "Your goal is to provide actionable, data-driven career advice to students.\n\n"
        "Follow this 4-step logic for every query:\n"
        "Step 1: Analyze the student's Department and Level.\n"
        "Step 2: Compare their Skills to industry standards.\n"
        "Step 3: Identify 3 specific career paths.\n"
        "Step 4: Provide 2 immediate 'Next Steps'.\n\n"
        "Be brief and casual in your replies. Always reference the Nigerian context.\n\n"
        + _profile_block(profile)
    )


# ---------------------------------------------------------------------------
# CORS helper
# ---------------------------------------------------------------------------

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
}


# ---------------------------------------------------------------------------
# Vercel handler
# ---------------------------------------------------------------------------


class handler(BaseHTTPRequestHandler):
    """Vercel Python serverless handler for POST /api/ai/chat"""

    def log_message(self, *args):  # silence default access logs
        pass

    def _send_json(self, status: int, body: dict):
        payload = json.dumps(body).encode()
        self.send_response(status)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)
        except Exception:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        message = data.get("message", "").strip()
        if not message:
            self._send_json(400, {"error": "No message provided"})
            return

        history: list[dict] = data.get("history", [])
        profile: dict = data.get("profile", {})

        if not GROQ_API_KEY:
            self._send_json(500, {"error": "GROQ_API_KEY not configured on server"})
            return

        # Build messages list
        messages = [{"role": "system", "content": _system_prompt(profile)}]
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        # Call Groq
        client = Groq(api_key=GROQ_API_KEY)
        try:
            # Try preferred model first, fall back to reliable one
            for model in (MODEL_PREFERRED, MODEL):
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=1000,
                    )
                    break
                except Exception:
                    if model == MODEL:
                        raise

            reply = response.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }
            self._send_json(200, {"reply": reply, "usage": usage})

        except Exception as exc:
            self._send_json(500, {"error": f"AI chat failed: {exc}"})
