# Cách chạy dự án

File này là bản ghi đầy đủ để tôi hoặc Claude mở lại dự án sau này mà không phải đọc lại code.

## 0. Điều cần biết trước

- App là **trang web tĩnh cộng một server Python nhỏ** (`serve.py`) giữ dữ liệu ra `data/dieukhien.json`. Không có bước build cho phần app. Phần web gồm:
  - `index.html` — chỉ khung HTML, nạp các file dưới bằng `<link>` / `<script src>`
  - `style.css` — toàn bộ CSS
  - `js/` — code app, mỗi mục một file (JavaScript thuần, sửa thẳng)
  - `vendor/tiptap.js` — bundle trình soạn thảo TipTap đã minify, **do build sinh ra, không sửa tay**
- `node_modules/` và `build/` **chỉ dùng khi cần build lại trình soạn thảo**. Chạy app thì không cần.

## 1. Chạy app (thường xuyên nhất)

### Bấm đúp `run.bat`

Đó là tất cả. File này `cd` vào thư mục dự án, bật `python serve.py` (cổng 8000), rồi tự mở `http://localhost:8000` sau vài giây.

- **Đóng cửa sổ đen** = tắt server. Không cần làm gì thêm. Tắt server lúc tab còn mở thì app báo đỏ; thay đổi vẫn giữ trong trình duyệt và được gửi lên ở lần mở sau.
- Máy không có Python thì `run.bat` báo lỗi và dừng — cố ý không mở thẳng `index.html`, vì cách đó dữ liệu chỉ nằm trong trình duyệt.
- Bấm `run.bat` khi đã có server đang chạy thì server cũ **tự bị tắt** trước (qua `tat-server-cu.ps1`), nên lúc nào cũng chỉ có một server. Script chỉ tắt thứ của app: cửa sổ `run.bat` cũ (cùng đường dẫn, tắt cả cửa sổ) và `python serve.py` đang giữ cổng 8000 (chạy tay trong terminal thì chỉ tắt python, để yên terminal). Chương trình khác chiếm cổng 8000 thì không bị tắt — `run.bat` báo tên nó rồi dừng.

### Vì sao qua server chứ không mở thẳng file

1. **Dữ liệu nằm ở server.** Mở `file://index.html` thì không có server, app chỉ lưu vào `localStorage` và hiện banner cảnh báo.
2. `file://index.html`, `http://localhost:8000` và `http://127.0.0.1:8000` là **ba origin khác nhau**, mỗi cái một `localStorage` riêng. Với server thì không còn quan trọng (dữ liệu lấy từ file), nhưng dữ liệu cũ chưa lên file thì chỉ thấy ở đúng origin cũ. `run.bat` luôn mở `localhost`.
3. Tính năng **"Liên kết file trên ổ đĩa"** (File System Access API) cần secure context, có thể bị chặn trên `file://`.

Nếu trước đây đã dùng `file://` và có dữ liệu thật ở đó: mở lại bằng đúng cách cũ, bấm **Xuất file**, rồi chạy `run.bat` và bấm **Nạp file** (bản đang có trong `data/dieukhien.json` sẽ được cất vào `data/backups` trước khi bị đè).

### Chạy tay

```powershell
python serve.py
# rồi mở http://localhost:8000
```

`serve.py` làm hai việc:

- Phát file tĩnh như `python -m http.server 8000` nhưng gửi `Cache-Control: no-cache` — không có header này, Chrome có thể giữ bản `js/*.js` / `style.css` cũ, sửa code xong F5 không thấy thay đổi.
- Giữ dữ liệu: `GET /api/data` đọc, `PUT /api/data` ghi (bắt buộc `If-Match` đúng mã phiên bản, lệch trả 409; `?keep=1` cất bản cũ trước), `POST /api/backup` cất một bản vào `data/backups`. Ghi ra file tạm rồi `os.replace`, sập giữa chừng không hỏng file.

Chỉ nghe `127.0.0.1` và `::1` — không lộ ra mạng LAN. Nghe cả `::1` là bắt buộc: Chrome gọi `localhost` thử IPv6 trước, thiếu thì mỗi request chậm thêm 50–300ms. API còn kiểm tra header `Host` và đòi header `X-App: dieukhien` để trang web lạ không gọi vào được.

## 2. Build lại trình soạn thảo (chỉ khi sửa `build/editor.src.js`)

```powershell
npm install          # lần đầu, hoặc sau khi đổi dependency
node build/build.js
```

`build/build.js` dùng esbuild bundle `build/editor.src.js` → `vendor/tiptap.js` (iife, minify, target es2019), rồi in ra kích thước. Build chỉ ghi đè `vendor/tiptap.js`, không đụng file nào khác.

`vendor/tiptap.js` **được commit vào git** để chạy app không cần Node.

Môi trường đã kiểm: Node v24.19.0, esbuild 0.28.2, Python 3.12.10, Windows 11.

## 3. Không có test

`npm test` chỉ là placeholder (`exit 1`). Kiểm tra bằng tay: mở app, tạo task, reload xem dữ liệu còn không.

## 4. Dữ liệu lưu ở đâu

| Nơi lưu | Khoá / cơ chế | Ghi chú |
|---|---|---|
| `data/dieukhien.json` | `serve.py`, `PUT /api/data` sau ~0.8 s | **nguồn chính**, gồm cả ảnh / file đính kèm (trường `images`) |
| `data/backups/` | `ngay-*` (đầu mỗi ngày, giữ 30), `truoc-khi-nap-*`, `trinh-duyet-*` | nạp lại bằng **Nạp file** |
| `localStorage` | khoá `dieukhien.v1` | bản đệm, lưu mỗi lần `save()` |
| `localStorage` | khoá `dieukhien.srv` = `{tag, dirty}` | mã phiên bản của file mà bản đệm dựa vào; `dirty` = còn thay đổi chưa gửi lên |
| `localStorage` | khoá `dieukhien.view` | trang đang xem, để tải lại trang vẫn ở nguyên chỗ cũ; riêng từng trình duyệt, không lên file |
| File trên ổ đĩa | `showSaveFilePicker`, tự ghi sau 1.2 s | tuỳ chọn, chỉ Chrome/Edge |
| `IndexedDB` | db `dieukhien-fs`, store `h` | chỉ giữ file handle để lần mở sau bấm 1 nút là kết nối lại |
| `IndexedDB` | db `dieukhien-img`, store `img` | ảnh và file đính kèm trong ghi chú (Blob, khoá = mã; ảnh `i…`, file `f…`); file xuất / file liên kết gói kèm ở trường `images` |
| Xuất/nạp tay | `dieukhien-<ngày>.json` | nút "Xuất file" / "Nạp file" ở sidebar |

Nạp file sẽ **ghi đè toàn bộ** dữ liệu hiện tại (có hỏi xác nhận trước).

Khởi động (`boot()` trong `js/storage.js`):

| Server | Trình duyệt | Làm gì |
|---|---|---|
| có file | trống, hoặc đã đồng bộ | dùng file |
| có file | `dirty` và cùng phiên bản với file | gửi bản trình duyệt lên (thay đổi lần trước chưa kịp gửi) |
| có file | dữ liệu chưa từng lên file, hoặc `dirty` nhưng file đã bị cửa sổ khác sửa | cất bản trình duyệt vào `data/backups`, dùng file |
| chưa có file | có dữ liệu | **hỏi** có dùng làm dữ liệu chính không; Huỷ thì chỉ lưu trong trình duyệt |
| chưa có file | trống | `seed()` tạo dữ liệu mẫu rồi ghi ra file |
| không nối được | — | dùng `localStorage` như cũ, báo đỏ + banner |

### Tắt máy có mất dữ liệu không?

**Không.** Dữ liệu là file `data/dieukhien.json` trên ổ đĩa. Sập điện giữa lúc đang dùng chỉ mất thay đổi của vài giây cuối — và cả chúng cũng còn trong `localStorage`, lần mở sau tự gửi lên.

Khi mở qua `run.bat`, những thứ **không còn** làm mất dữ liệu: xoá cache / "Cookies and other site data", CCleaner, đổi tài khoản / profile Chrome, đổi trình duyệt, cửa sổ ẩn danh, gỡ cài lại trình duyệt, ổ đĩa đầy khiến trình duyệt dọn dữ liệu site.

Những thứ **vẫn** làm mất dữ liệu:

| Nguyên nhân | Hậu quả |
|---|---|
| Xoá thư mục `data/`, hoặc `git clean -x` (xoá cả file bị ignore) | Mất sạch, kể cả backup |
| Hỏng ổ đĩa / mất máy | Mất sạch |
| Mở thẳng `index.html` rồi dùng lâu dài | Dữ liệu chỉ trong trình duyệt (app hiện banner cảnh báo) |

### Cách yên tâm hẳn

1. Chạy bằng `run.bat`, nhìn sidebar thấy **Đã lưu vào máy** là được.
2. Chép thư mục `data/` sang chỗ khác theo định kỳ, hoặc bật **"Liên kết file trên ổ đĩa"** và chọn file nằm trong OneDrive/Google Drive — thêm một bản ngoài máy, có lịch sử phiên bản.
3. Thỉnh thoảng bấm **Xuất file** — mỗi lần ra một `dieukhien-<ngày>.json`.

### Xoá sạch để test từ đầu

Mở DevTools Console tại trang app:

```js
localStorage.removeItem('dieukhien.v1');
localStorage.removeItem('dieukhien.srv');
localStorage.removeItem('dieukhien.view');
indexedDB.deleteDatabase('dieukhien-fs');
indexedDB.deleteDatabase('dieukhien-img');
location.reload();
```

Rồi **đổi tên** (đừng xoá) thư mục `data/` khi server đang tắt, nếu muốn cả file dữ liệu cũng bắt đầu lại từ đầu.

## 5. Lưu ý khi sửa code

- Sửa app → sửa `js/` (logic), `style.css` (giao diện), `index.html` (khung HTML). Không cần build.
- Sửa trình soạn thảo → sửa `build/editor.src.js`, rồi `node build/build.js`. **Đừng sửa tay `vendor/tiptap.js`**, build sẽ ghi đè.
- Các file trong `js/` là script thường (không phải ES module) để mở thẳng `file://` vẫn chạy — đừng đổi sang `type="module"` / `import`. Chúng dùng chung biến toàn cục, nên thứ tự `<script>` trong `index.html` quan trọng: code chạy ngay lúc tải trang (không nằm trong hàm) chỉ được gọi tới thứ đã khai báo ở file nạp trước. Thêm file mới thì nhớ thêm thẻ `<script>`.
- App chỉ gọi trình soạn thảo qua `window.TT`, không chạm trực tiếp ProseMirror. Giữ nguyên ranh giới này.
- `backlog-human.md` là ghi chú riêng của chủ dự án, dòng đầu ghi rõ AI không được đọc — **bỏ qua file này**.
