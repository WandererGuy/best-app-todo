# Trung tâm điều khiển

App quản lý công việc và nhật ký cá nhân, là một trang web tĩnh (HTML + CSS + JS thuần, không framework). Không backend, không tài khoản, không đưa dữ liệu ra internet — mở file là dùng được, dữ liệu nằm trên máy.

**Chạy:** bấm đúp `run.bat`. Đóng cửa sổ đen là tắt.

> Chi tiết cách chạy, cách build, và chuyện dữ liệu có mất khi tắt máy: xem [RUN.md](RUN.md).

## Ý tưởng

Một chỗ duy nhất cho việc cần làm và cho suy nghĩ về việc đó. Task không chỉ là một dòng tiêu đề — mỗi task có một ô ghi chú viết được như trang Notion, để mọi thứ vụn vặt liên quan đến nó có nơi để ném vào thay vì tản mác ở chỗ khác.

Ràng buộc tự đặt: **không backend, chạy offline, dữ liệu là của người dùng**. Điều này quyết định mọi lựa chọn kỹ thuật bên dưới.

## Có gì

**Bảng việc** — 3 cột `Cần làm / Đang làm / Xong`, kéo thả giữa các cột. Mỗi task có: mảng (Công việc / Cuộc sống / Khác), ưu tiên (Thấp / Trung bình / Cao), phần trăm tiến độ, hạn chót, tag, danh sách việc con, và ghi chú.

**Bảng cuộc sống** — bảng kanban riêng cho task mảng Cuộc sống, cùng kiểu với Bảng việc. Bảng việc chỉ còn mảng Công việc và Khác. Hai bảng dùng chung lịch, nhắc việc và tổng quan.

**Để sau** — chỗ cho việc chưa cam kết làm, dùng chung cho mọi mảng. Task ở đây không lên bảng, lịch, nhắc việc và không tính vào tổng quan. Gõ vào ô trên cùng rồi Enter để ghi nhanh; mỗi dòng hiện tuổi tính từ ngày tạo và nút **→ Cần làm** để đưa lên cuối cột Cần làm. Chiều ngược lại: kéo card trên bảng thả vào mục **Để sau** ở sidebar, hoặc chọn trạng thái **Để sau** trong panel task / form tạo task.

**Tag** — danh sách tag dùng chung, mỗi tag một màu riêng. Bấm **Quản lý** cạnh mục Tag ở sidebar để thêm, đổi tên, xoá tag và đổi màu — chọn từ bảng 72 màu hoặc màu bất kỳ (bộ chọn màu / mã hex). Đổi tên trùng một tag có sẵn thì app hỏi gộp hai tag. Khi gắn tag cho task, các tag đã có hiện sẵn để bấm chọn lại; gõ tên mới rồi Enter sẽ tạo tag mới.

**Panel task** — bấm vào task để mở drawer bên phải: sửa mọi trường, tick việc con, viết ghi chú.

**Lịch** — ba chế độ **Ngày / Tuần / Tháng** (app nhớ chế độ chọn gần nhất). Ngày và Tuần là lưới giờ kiểu Google Calendar: task có giờ nằm đúng khung giờ, task chỉ có ngày hạn nằm ở hàng "Cả ngày". Bấm khung trống để tạo task vào giờ đó, bấm tên ngày để xem riêng ngày đó. Tháng là lưới tháng: task hiện ở đúng ngày hạn chót, ngày có nhật ký được đánh dấu.

**Lịch ngày ở sidebar** — dòng thời gian 24 giờ kiểu Google Calendar, chia ô 30 phút. Bấm ô trống để mở form tạo task, ngày và giờ được điền sẵn. Bấm vào một block để mở task đó. Việc trùng giờ được xếp cạnh nhau. Nút **⤢** mở lịch lớn theo tuần.

**Khung giờ & nhắc việc** — mỗi task đặt được giờ bắt đầu, thời lượng và mốc nhắc trước (mặc định 30 phút), cả trong form tạo lẫn panel chi tiết. Giờ gắn với ngày hạn chót. Đến mốc nhắc thì app hiện toast, thêm thông báo vào **chuông** ở thanh trên và bắn thông báo hệ thống nếu đã cho phép. Nhắc việc chỉ chạy khi app đang mở.

**Nhật ký** — mỗi ngày một hoặc nhiều trang, viết tự do bằng trình soạn thảo giàu định dạng.

**Ghi chú** — trang không gắn với ngày, lồng nhau như Notion. Cột trái là cây trang: bấm ▸ để mở trang con, rê chuột vào một trang rồi bấm **+** để thêm trang con. Mỗi trang có tiêu đề, tag (dùng chung với task), nội dung soạn bằng cùng trình soạn thảo, **ngày tạo** và **sửa lần cuối** (cập nhật khi đổi tiêu đề, nội dung hoặc tag). Ghim trang để nó hiện ở mục **Đã ghim** trên đầu cây; **Chuyển vào…** để đưa trang (kèm trang con) vào trang khác hoặc về cấp gốc. Gõ vào ô tìm kiếm hoặc bấm một tag ở sidebar thì cây thành danh sách trang khớp, mới sửa lên đầu. Bỏ một trang thì cả các trang con cùng vào **Thùng rác**, khôi phục cũng khôi phục cả cây.

**Tổng quan** — tỉ lệ hoàn thành, số task trễ hạn, biểu đồ 7 ngày gần nhất, tiến độ trung bình, streak ngày viết nhật ký.

**Lọc và tìm** — theo tag (sidebar) và tìm toàn văn trên tiêu đề / tag / ghi chú. Riêng Bảng việc và Bảng cuộc sống có thêm nút **Lọc** trên thanh công cụ (hiện số bộ lọc đang bật), bấm vào mở bảng chọn: khoảng thời gian (hôm nay / 7 ngày / tháng này / tất cả), ưu tiên (chọn được nhiều mức), hạn (trễ hạn / hạn hôm nay / chưa có hạn), mảng Công việc / Khác (chỉ ở Bảng việc), và cách sắp xếp thẻ (thủ công / theo ưu tiên / chia nhóm ưu tiên).

## Trình soạn thảo

Ghi chú task và trang nhật ký dùng TipTap (ProseMirror). Gõ `/` để mở menu chèn khối, hoặc dùng phím tắt markdown:

| Gõ | Thành |
|---|---|
| `# ` `## ` `### ` | Tiêu đề lớn / vừa / nhỏ |
| `[] ` | Danh sách việc (tick được) |
| `- ` | Gạch đầu dòng |
| `1. ` | Danh sách đánh số |
| `> ` | Trích dẫn |
| ` ``` ` | Khối code |
| `---` | Đường kẻ ngang |

Bôi đen chữ để hiện thanh định dạng nổi (đậm, nghiêng, gạch ngang, code, link). Link tự nhận dạng khi gõ, mở ở tab mới.

**Ảnh** — dán (Ctrl+V), kéo thả file ảnh vào, hoặc gõ `/` chọn **Ảnh**. Ảnh có cạnh dài quá 2560px (hoặc nặng quá 800KB) được thu nhỏ về 2560px WebP; ảnh nhỏ giữ nguyên file gốc. Bấm đúp vào ảnh để mở cỡ thật ở tab mới.

**File đính kèm** — kéo thả hoặc dán file bất kỳ (PDF, Word, Excel, zip…) vào ghi chú, hoặc gõ `/` chọn **File đính kèm**. File hiện thành một thẻ có tên, dung lượng và nút **Tải về**. PDF, ảnh, audio, video và file chữ/code (txt, md, csv, json…) có thêm nút **Xem** để mở ở tab mới; Word/Excel/PowerPoint thì chỉ tải về được. File `.html` / `.svg` luôn được xem dưới dạng chữ thuần, không chạy. Mỗi file tối đa 25MB. Chọn thẻ rồi bấm Backspace để gỡ.

## Dữ liệu

Lưu vào `localStorage` mỗi lần thay đổi. Sidebar có chỉ báo thời điểm lưu gần nhất — nếu trình duyệt chặn ghi, chỉ báo chuyển đỏ và nhắc xuất file.

Ngoài ra:
- **Liên kết file trên ổ đĩa** (Chrome/Edge): chọn một file `.json`, từ đó mọi thay đổi tự ghi ra file thật. Handle được giữ trong IndexedDB nên lần mở sau chỉ cần bấm một nút để kết nối lại.
- **Xuất / Nạp file** JSON thủ công, dùng để backup hoặc chuyển sang máy khác.

Định dạng dữ liệu là JSON thuần: `{ tasks: [], journal: {}, notes: [], settings: {} }`. Đọc được bằng mắt, sửa được bằng tay.

Ảnh và file đính kèm không nằm trong `localStorage` (giới hạn ~5MB) mà trong IndexedDB; ghi chú chỉ giữ `<img data-img="mã">` / `<div data-file="mã" data-name data-size>`. File xuất ra và file liên kết có thêm trường `images: {mã: data URL}` chứa các ảnh và file đang được dùng (tên trường giữ nguyên để backup cũ vẫn nạp được), nên backup có đủ ảnh; nạp file sẽ đưa ảnh trở lại IndexedDB.

Có sẵn đường nâng cấp cho dữ liệu cũ: nhật ký định dạng cũ (một chuỗi mỗi ngày) tự chuyển thành dạng nhiều trang khi nạp; ghi chú viết bằng markdown hoặc HTML bản cũ được chuyển sang định dạng TipTap hiểu.

## Cấu trúc

```
run.bat                Bấm đúp là chạy: bật server tĩnh rồi mở trình duyệt
serve.py               Server tĩnh cổng 8000, tắt cache
index.html             Khung HTML, nạp các file dưới
style.css              Toàn bộ CSS
app.js                 Toàn bộ code app
vendor/tiptap.js       Bundle TipTap đã minify (build sinh ra, không sửa tay)
build/editor.src.js    Nguồn lớp bọc trình soạn thảo, xuất ra window.TT
build/build.js         esbuild bundle ra vendor/tiptap.js
package.json           Chỉ phục vụ bước build (TipTap + esbuild)
RUN.md                 Cách chạy, build, và xử lý dữ liệu
```

Ranh giới quan trọng: code app chỉ gọi trình soạn thảo qua `window.TT`, không chạm trực tiếp vào ProseMirror. Nhờ vậy phần app vẫn là JavaScript thuần không cần build, và bundle TipTap là thứ duy nhất phải qua esbuild.

## Yêu cầu

Chạy app: một trình duyệt hiện đại. Không cần Node.

Build lại trình soạn thảo: Node (đã kiểm với v24) và `npm install`.

Giao diện và toàn bộ chú thích trong code viết bằng tiếng Việt.
