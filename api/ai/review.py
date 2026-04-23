"""
Nile Connect – AI CV/Resume Reviewer
Vercel Python serverless function → POST /api/ai/review

Accepts multipart/form-data:
  file            – PDF file (required, max 5 MB)
  job_description – optional plain-text JD to compare against
  profile         – JSON string of StudentProfile for personalised feedback

Core AI logic extracted from the original CV Reviewer Demo.
Custom UI layer stripped; CORS + dynamic profile injection added.
"""

import cgi
import io
import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler

import pdfplumber
import pypdf
from groq import Groq

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"
MODEL_PREFERRED = "openai/gpt-oss-20b"
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB

# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------


def _profile_block(profile: dict) -> str:
    if not profile:
        return "No specific student profile provided – give general CV feedback."

    lines = ["Student Profile:"]
    if v := profile.get("full_name"):
        lines.append(f"- Name: {v}")
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
    if v := profile.get("certifications"):
        certs = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Certifications: {certs}")
    if v := profile.get("career_interests"):
        interests = v if isinstance(v, str) else ", ".join(v)
        lines.append(f"- Career Interests: {interests}")

    return "\n".join(lines)


def _review_system_prompt(profile: dict) -> str:
    return (
        "You are the Nile University AI CV/Resume Reviewer. "
        "You deeply understand the Nigerian job market and student context.\n\n"
        "When reviewing a CV (provided as extracted text), follow these steps:\n"
        "1. Parse the text to understand the student's qualifications.\n"
        "2. If a target Job Description is provided, compare the CV against it.\n"
        "3. Provide a Match Score out of 100 (format: 'Match Score: XX/100').\n"
        "4. Give exactly three feedback sections:\n"
        "   - **Keep**: What they did well.\n"
        "   - **Add**: Specific keywords or skills missing.\n"
        "   - **Fix**: Formatting or content improvements.\n"
        "5. End with a Nile-Specific Tip based on their level and department.\n\n"
        "Be encouraging but honest. Keep it concise.\n\n"
        + _profile_block(profile)
    )


# ---------------------------------------------------------------------------
# PDF extraction helpers
# ---------------------------------------------------------------------------


def _extract_pdf_text(file_bytes: bytes) -> tuple[str, int]:
    """Return (extracted_text, page_count). Tries pdfplumber first, pypdf as fallback."""
    text = ""
    page_count = 0

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except Exception:
        pass

    if not text.strip():
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception:
            pass

    return text.strip(), page_count


# ---------------------------------------------------------------------------
# CORS
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
    """Vercel Python serverless handler for POST /api/ai/review"""

    def log_message(self, *args):
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
        content_type = self.headers.get("Content-Type", "")

        if "multipart/form-data" not in content_type:
            self._send_json(400, {"error": "Expected multipart/form-data"})
            return

        # Parse multipart body
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_UPLOAD_BYTES + 1024:  # +1 KB for form fields
            self._send_json(413, {"error": "Request too large (max 5 MB)"})
            return

        body_bytes = self.rfile.read(length)

        # cgi.FieldStorage needs a file-like + environ dict
        environ = {
            "REQUEST_METHOD": "POST",
            "CONTENT_TYPE": content_type,
            "CONTENT_LENGTH": str(length),
        }
        form = cgi.FieldStorage(
            fp=io.BytesIO(body_bytes),
            environ=environ,
            keep_blank_values=True,
        )

        # Validate file field
        if "file" not in form:
            self._send_json(400, {"error": "No 'file' field in form data"})
            return

        file_item = form["file"]
        if not file_item.filename:
            self._send_json(400, {"error": "Empty filename"})
            return
        if not file_item.filename.lower().endswith(".pdf"):
            self._send_json(400, {"error": "Only PDF files are accepted"})
            return

        file_bytes = file_item.file.read()
        if len(file_bytes) > MAX_UPLOAD_BYTES:
            self._send_json(413, {"error": "PDF exceeds 5 MB limit"})
            return

        # Extract text
        cv_text, page_count = _extract_pdf_text(file_bytes)
        if not cv_text:
            self._send_json(400, {
                "error": (
                    "No text could be extracted from this PDF. "
                    "Ensure it is not a scanned image."
                )
            })
            return

        # Optional form fields
        job_description = ""
        if "job_description" in form:
            jd_item = form["job_description"]
            job_description = (
                jd_item.value if isinstance(jd_item, cgi.MiniFieldStorage) else ""
            ).strip()

        profile: dict = {}
        if "profile" in form:
            try:
                p_item = form["profile"]
                raw = p_item.value if isinstance(p_item, cgi.MiniFieldStorage) else "{}"
                profile = json.loads(raw)
            except Exception:
                profile = {}

        # Build user message
        user_message = f"Here is my CV/resume text:\n\n{cv_text}"
        if job_description:
            user_message += f"\n\nTarget Job Description:\n{job_description}"
        else:
            user_message += "\n\nNo specific job description provided. Give general feedback."

        if not GROQ_API_KEY:
            self._send_json(500, {"error": "GROQ_API_KEY not configured on server"})
            return

        client = Groq(api_key=GROQ_API_KEY)
        try:
            for model in (MODEL_PREFERRED, MODEL):
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": _review_system_prompt(profile)},
                            {"role": "user", "content": user_message},
                        ],
                        temperature=0.6,
                        max_tokens=1500,
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
            self._send_json(200, {
                "review": reply,
                "pages_parsed": page_count,
                "usage": usage,
            })

        except Exception as exc:
            self._send_json(500, {"error": f"AI review failed: {exc}"})
