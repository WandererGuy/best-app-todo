# Server cho app: phát file tĩnh (tắt cache, sửa js/*.js / style.css xong chỉ cần F5)
# và giữ dữ liệu ở data/dieukhien.json — nằm ngoài trình duyệt, nên xoá cache hay đổi
# profile Chrome không làm mất gì.
#
#   GET  /api/data          dữ liệu hiện tại (404 nếu chưa có), header ETag = mã phiên bản
#   PUT  /api/data          ghi đè; bắt buộc If-Match đúng phiên bản đang có ("none" khi chưa có file),
#                           lệch thì trả 409 — tránh cửa sổ cũ ghi đè lên thay đổi ở cửa sổ khác.
#                           ?keep=1: cất bản cũ vào backups/ trước khi ghi (dùng khi nạp file)
#   POST /api/backup        cất một bản vào backups/ (dữ liệu trình duyệt không được dùng, bản bị từ chối)
#
# Lần ghi đầu tiên mỗi ngày tự cất bản cũ thành backups/ngay-YYYY-MM-DD.json, giữ 30 ngày gần nhất.
import hashlib, http.server, json, os, socket, threading, time
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data', 'dieukhien.json')
BACKUPS = os.path.join(ROOT, 'data', 'backups')
KEEP_DAYS = 30
PORT = 8000
lock = threading.Lock()

def etag():
    try:
        with open(DATA, 'rb') as f: return '"' + hashlib.sha1(f.read()).hexdigest() + '"'
    except FileNotFoundError: return 'none'

def write(path, body):
    # ghi ra file tạm rồi thay thế một lần, sập giữa chừng cũng không hỏng file cũ
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f: f.write(body); f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)

def backup(name, body):
    base = os.path.join(BACKUPS, f'{name}-{time.strftime("%Y%m%d-%H%M%S")}')
    path, n = base + '.json', 1
    while os.path.exists(path): n += 1; path = f'{base}-{n}.json'   # cùng giây thì đánh số, không đè
    write(path, body)

def daily_backup():
    if not os.path.exists(DATA): return
    path = os.path.join(BACKUPS, f'ngay-{time.strftime("%Y-%m-%d")}.json')
    if os.path.exists(path): return
    with open(DATA, 'rb') as f: write(path, f.read())
    days = sorted(n for n in os.listdir(BACKUPS) if n.startswith('ngay-'))
    for n in days[:-KEEP_DAYS]: os.remove(os.path.join(BACKUPS, n))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def reply(self, code, body=b'', tag=None):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-App', 'dieukhien')   # để app phân biệt với server tĩnh thường (cũng trả 404)
        if tag: self.send_header('ETag', tag)
        self.end_headers()
        self.wfile.write(body)

    def local_only(self):
        # chặn trang web lạ gọi vào (DNS rebinding) và buộc có header riêng để request từ site khác phải qua preflight
        host = (self.headers.get('Host') or '').rsplit(':', 1)[0]
        if host not in ('localhost', '127.0.0.1'): self.reply(403); return False
        return True

    def body(self):
        raw = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        d = json.loads(raw)
        if not isinstance(d, dict) or not isinstance(d.get('tasks'), list): raise ValueError('sai định dạng')
        return raw

    def do_GET(self):
        if urlsplit(self.path).path != '/api/data': return super().do_GET()
        if not self.local_only(): return
        with lock:
            if not os.path.exists(DATA): return self.reply(404)
            with open(DATA, 'rb') as f: raw = f.read()
        self.reply(200, raw, '"' + hashlib.sha1(raw).hexdigest() + '"')

    def do_PUT(self):
        url = urlsplit(self.path)
        if url.path != '/api/data': return self.reply(404)
        if not self.local_only() or self.headers.get('X-App') != 'dieukhien': return self.reply(403)
        try: raw = self.body()
        except Exception: return self.reply(400)
        with lock:
            cur = etag()
            if self.headers.get('If-Match') != cur: return self.reply(409, tag=cur)
            if os.path.exists(DATA):
                if 'keep=1' in url.query:
                    with open(DATA, 'rb') as f: backup('truoc-khi-nap', f.read())
                daily_backup()
            write(DATA, raw)
        self.reply(200, tag='"' + hashlib.sha1(raw).hexdigest() + '"')

    def do_POST(self):
        if urlsplit(self.path).path != '/api/backup': return self.reply(404)
        if not self.local_only() or self.headers.get('X-App') != 'dieukhien': return self.reply(403)
        try: raw = self.body()
        except Exception: return self.reply(400)
        with lock: backup('trinh-duyet', raw)
        self.reply(200)

# chỉ nghe trên máy này (API ghi được dữ liệu, không để lộ ra mạng LAN), nhưng nghe cả IPv4 lẫn IPv6:
# Chrome gọi localhost thử ::1 trước, thiếu nó thì mỗi request chậm thêm vài trăm ms
class Server6(http.server.ThreadingHTTPServer): address_family = socket.AF_INET6
servers = [http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)]
try: servers.append(Server6(('::1', PORT), Handler))
except OSError: pass   # máy tắt IPv6
for s in servers[1:]: threading.Thread(target=s.serve_forever, daemon=True).start()
print(f'Dang chay tai http://localhost:{PORT} - du lieu: {DATA}', flush=True)   # không dấu: console cp1252 in tiếng Việt sẽ sập server
try: servers[0].serve_forever()
except KeyboardInterrupt: pass
