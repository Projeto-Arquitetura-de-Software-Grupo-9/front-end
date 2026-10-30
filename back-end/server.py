#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor HTTP Python para Leitura de QR Code e Correção OMR (SGP Católica SC / Correge).
Pode ser executado diretamente com: python back-end/server.py
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from omr_scanner import process_omr_request

PORT = 5000


class OMRRequestHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status_code: int = 200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(200)

    def do_GET(self):
        if self.path in ("/", "/health", "/api/omr/health"):
            self._set_cors_headers(200)
            response = {
                "status": "online",
                "service": "correge-python-omr-engine",
                "opencv": True,
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

    def do_POST(self):
        if self.path in ("/api/omr/scan", "/api/omr/grade", "/api/omr"):
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                payload = json.loads(raw_body)
                if self.path.endswith("/grade"):
                    payload["action"] = "grade"
                result = process_omr_request(payload)
                self._set_cors_headers(200 if result.get("success") else 400)
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
            except Exception as exc:
                self._set_cors_headers(500)
                self.wfile.write(
                    json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False).encode("utf-8")
                )
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), OMRRequestHandler)
    print(f"🚀 Servidor Python OMR & QR Code ativo em http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor OMR Python...")
        server.server_close()
