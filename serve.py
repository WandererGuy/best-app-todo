# Server tĩnh cho app, như `python -m http.server 8000` nhưng tắt cache:
# sửa app.js / style.css xong chỉ cần F5, trình duyệt không giữ bản cũ.
import http.server

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

http.server.test(HandlerClass=Handler, port=8000)
