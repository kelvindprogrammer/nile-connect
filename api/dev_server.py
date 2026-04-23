"""
Local development server for the Nile Connect AI endpoints.
Run this to test AI features without the Vercel CLI.

Usage:
    pip install -r requirements.txt
    python api/dev_server.py

Then set in your .env.local:
    VITE_AI_BASE_URL=http://localhost:5001

Endpoints:
    POST http://localhost:5001/ai/chat
    POST http://localhost:5001/ai/review
"""

import sys
import os

# Make api/ importable
sys.path.insert(0, os.path.dirname(__file__))

from http.server import HTTPServer, BaseHTTPRequestHandler
from ai.chat import handler as ChatHandler
from ai.review import handler as ReviewHandler


class Router(BaseHTTPRequestHandler):
    """Routes /ai/chat and /ai/review to their respective handlers."""

    def log_message(self, fmt, *args):
        print(f"[dev_server] {self.command} {self.path} → {args[0] if args else ''}")

    def _route(self, method: str):
        path = self.path.split("?")[0].rstrip("/")

        if path == "/ai/chat":
            h = ChatHandler(self.request, self.client_address, self.server)
            h.rfile = self.rfile
            h.wfile = self.wfile
            h.headers = self.headers
            h.command = self.command
            h.path = self.path
            if method == "OPTIONS":
                h.do_OPTIONS()
            else:
                h.do_POST()

        elif path == "/ai/review":
            h = ReviewHandler(self.request, self.client_address, self.server)
            h.rfile = self.rfile
            h.wfile = self.wfile
            h.headers = self.headers
            h.command = self.command
            h.path = self.path
            if method == "OPTIONS":
                h.do_OPTIONS()
            else:
                h.do_POST()

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error":"Not found"}')

    def do_OPTIONS(self):
        self._route("OPTIONS")

    def do_POST(self):
        self._route("POST")


if __name__ == "__main__":
    port = int(os.environ.get("AI_DEV_PORT", 5001))
    server = HTTPServer(("", port), Router)
    print(f"[dev_server] AI endpoints running on http://localhost:{port}")
    print(f"[dev_server]   POST /ai/chat")
    print(f"[dev_server]   POST /ai/review")
    print(f"[dev_server] Press Ctrl+C to stop\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[dev_server] Stopped.")
