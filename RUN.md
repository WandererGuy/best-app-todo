# Cách chạy dự án

File này là bản ghi đầy đủ để tôi hoặc Claude mở lại dự án sau này mà không phải đọc lại code.

## 0. Điều cần biết trước

- App là **trang web tĩnh**, không có backend, không có bước build cho phần app. Gồm 4 file:
  - `index.html` — chỉ khung HTML, nạp 3 file dưới bằng `<link>` / `<script src>`
  - `style.css` — toàn bộ CSS
  - `app.js` — toàn bộ code app (JavaScript thuần, sửa thẳng)
  - `vendor/tiptap.js` — bundle trình soạn thảo TipTap đã minify, **do build sinh ra, không sửa tay**
- `node_modules/` và `build/` **chỉ dùng khi cần build lại trình soạn thảo**. Chạy app thì không cần.

## 1. Chạy app (thường xuyên nhất)

### Bấm đúp `run.bat`

Đó là tất cả. File này `cd` vào thư mục dự án, bật `python serve.py` (server tĩnh cổng 8000), rồi tự mở `http://localhost:8000` sau vài giây.

- **Đóng cửa sổ đen** = tắt server. Không cần làm gì thêm.
- Nếu máy không có Python, file tự chuyển sang mở trực tiếp `index.html` (vẫn dùng được, nhưng mất tính năng liên kết file).
- Báo `address already in use` = còn một cửa sổ `run.bat` khác đang chiếm cổng 8000. Đóng cửa sổ đó rồi chạy lại.

### Vì sao qua server chứ không mở thẳng file

1. Tính năng **"Liên kết file trên ổ đĩa"** (File System Access API — `showSaveFilePicker`) cần secure context, có thể bị chặn trên `file://`; qua `localhost` thì chắc chắn chạy. Chỉ Chrome/Edge có API này, Firefox/Safari tự ẩn nút.
2. Quan trọng hơn: `file://index.html` và `http://localhost:8000` là **hai origin khác nhau**, nên có **hai localStorage riêng biệt**. Task tạo ở cách này không hiện ở cách kia. Chọn một cách rồi dùng mãi cách đó — và `run.bat` chính là để khỏi phải nhớ.

Nếu trước đây đã dùng `file://` và có dữ liệu thật ở đó: mở lại bằng đúng cách cũ, bấm **Xuất file**, rồi chạy `run.bat` và bấm **Nạp file** để chuyển dữ liệu sang origin localhost.

### Chạy tay

```powershell
python serve.py
# rồi mở http://localhost:8000
```

`serve.py` giống `python -m http.server 8000` nhưng gửi `Cache-Control: no-cache`. Không có header này, Chrome có thể giữ bản `app.js` / `style.css` cũ trong cache, sửa code xong F5 không thấy thay đổi.

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
| `localStorage` | khoá `dieukhien.v1` | nguồn chính, lưu mỗi lần `save()` |
| File trên ổ đĩa | `showSaveFilePicker`, tự ghi sau 1.2 s | tuỳ chọn, chỉ Chrome/Edge |
| `IndexedDB` | db `dieukhien-fs`, store `h` | chỉ giữ file handle để lần mở sau bấm 1 nút là kết nối lại |
| `IndexedDB` | db `dieukhien-img`, store `img` | ảnh và file đính kèm trong ghi chú (Blob, khoá = mã; ảnh `i…`, file `f…`); file xuất / file liên kết gói kèm ở trường `images` |
| Xuất/nạp tay | `dieukhien-<ngày>.json` | nút "Xuất file" / "Nạp file" ở sidebar |

Nạp file sẽ **ghi đè toàn bộ** dữ liệu hiện tại (có hỏi xác nhận trước).

Lần mở đầu tiên, nếu `localStorage` trống, `seed()` tạo 5 task mẫu + 1 trang nhật ký mẫu.

### Tắt máy có mất dữ liệu không?

**Không.** `localStorage` ghi xuống ổ đĩa trong profile trình duyệt, không phải RAM. Tắt máy, khởi động lại, mở lại app — dữ liệu còn nguyên. Sập điện giữa lúc đang dùng cũng chỉ mất thay đổi của vài giây cuối.

Những thứ **thực sự** làm mất dữ liệu:

| Nguyên nhân | Hậu quả |
|---|---|
| Xoá "Cookies and other site data" / dọn dẹp trình duyệt, CCleaner | Mất sạch |
| Mở app ở trình duyệt khác, hoặc profile khác của cùng trình duyệt | Không thấy dữ liệu (nó vẫn nằm ở profile cũ) |
| Đổi cách mở: `file://` ↔ `localhost:8000` | Không thấy dữ liệu (hai origin, hai kho riêng) |
| Cửa sổ ẩn danh (Incognito) | Mất khi đóng cửa sổ |
| Gỡ / cài lại trình duyệt | Mất sạch |
| Ổ đĩa gần đầy | Trình duyệt có thể dọn bớt dữ liệu site |

Nói cách khác: rủi ro không nằm ở việc tắt máy, mà ở chỗ dữ liệu chỉ tồn tại **bên trong một trình duyệt**.

### Cách yên tâm hẳn

1. Chạy bằng `run.bat` (origin luôn cố định là `localhost:8000`).
2. Chrome/Edge: bấm **"Liên kết file trên ổ đĩa"** một lần, chọn file `.json` ở chỗ dễ tìm. Từ đó mọi thay đổi tự ghi ra file thật, độc lập hoàn toàn với trình duyệt — xoá cache hay cài lại trình duyệt cũng không ảnh hưởng. Lần mở sau chỉ cần bấm một nút để kết nối lại.
3. Nếu để file `.json` đó trong thư mục OneDrive/Google Drive thì có luôn backup theo phiên bản.
4. Không dùng cách 2 thì thỉnh thoảng bấm **Xuất file** — mỗi lần ra một `dieukhien-<ngày>.json`.

### Xoá sạch để test từ đầu

Mở DevTools Console tại trang app:

```js
localStorage.removeItem('dieukhien.v1');
indexedDB.deleteDatabase('dieukhien-fs');
indexedDB.deleteDatabase('dieukhien-img');
location.reload();
```

## 5. Lưu ý khi sửa code

- Sửa app → sửa `app.js` (logic), `style.css` (giao diện), `index.html` (khung HTML). Không cần build.
- Sửa trình soạn thảo → sửa `build/editor.src.js`, rồi `node build/build.js`. **Đừng sửa tay `vendor/tiptap.js`**, build sẽ ghi đè.
- `app.js` là script thường (không phải ES module) để mở thẳng `file://` vẫn chạy — đừng đổi sang `type="module"` / `import`.
- App chỉ gọi trình soạn thảo qua `window.TT`, không chạm trực tiếp ProseMirror. Giữ nguyên ranh giới này.
- `backlog-human.md` là ghi chú riêng của chủ dự án, dòng đầu ghi rõ AI không được đọc — **bỏ qua file này**.
