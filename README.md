# Trung tâm điều khiển

App quản lý công việc và nhật ký cá nhân, gói trong **một file HTML duy nhất**. Không server, không tài khoản, không đưa dữ liệu ra internet — mở file là dùng được, dữ liệu nằm trên máy.

**Chạy:** bấm đúp `run.bat`. Đóng cửa sổ đen là tắt.

> Chi tiết cách chạy, cách build, và chuyện dữ liệu có mất khi tắt máy: xem [RUN.md](RUN.md).

## Ý tưởng

Một chỗ duy nhất cho việc cần làm và cho suy nghĩ về việc đó. Task không chỉ là một dòng tiêu đề — mỗi task có một ô ghi chú viết được như trang Notion, để mọi thứ vụn vặt liên quan đến nó có nơi để ném vào thay vì tản mác ở chỗ khác.

Ràng buộc tự đặt: **một file, chạy offline, dữ liệu là của người dùng**. Điều này quyết định mọi lựa chọn kỹ thuật bên dưới.

## Có gì

**Bảng việc** — 3 cột `Cần làm / Đang làm / Xong`, kéo thả giữa các cột. Mỗi task có: mảng (Công việc / Cuộc sống / Khác), ưu tiên (Thấp / Trung bình / Cao), phần trăm tiến độ, hạn chót, tag, danh sách việc con, và ghi chú.

**Bảng cuộc sống** — bảng kanban riêng cho task mảng Cuộc sống, cùng kiểu với Bảng việc. Bảng việc chỉ còn mảng Công việc và Khác. Hai bảng dùng chung lịch, nhắc việc và tổng quan.

**Tag** — danh sách tag dùng chung, mỗi tag một màu riêng. Bấm **Quản lý** cạnh mục Tag ở sidebar để thêm, đổi tên, xoá tag và đổi màu — chọn từ bảng 72 màu hoặc màu bất kỳ (bộ chọn màu / mã hex). Đổi tên trùng một tag có sẵn thì app hỏi gộp hai tag. Khi gắn tag cho task, các tag đã có hiện sẵn để bấm chọn lại; gõ tên mới rồi Enter sẽ tạo tag mới.

**Panel task** — bấm vào task để mở drawer bên phải: sửa mọi trường, tick việc con, viết ghi chú.

**Lịch** — ba chế độ **Ngày / Tuần / Tháng** (app nhớ chế độ chọn gần nhất). Ngày và Tuần là lưới giờ kiểu Google Calendar: task có giờ nằm đúng khung giờ, task chỉ có ngày hạn nằm ở hàng "Cả ngày". Bấm khung trống để tạo task vào giờ đó, bấm tên ngày để xem riêng ngày đó. Tháng là lưới tháng: task hiện ở đúng ngày hạn chót, ngày có nhật ký được đánh dấu.

**Lịch ngày ở sidebar** — dòng thời gian 24 giờ kiểu Google Calendar, chia ô 30 phút. Bấm ô trống để mở form tạo task, ngày và giờ được điền sẵn. Bấm vào một block để mở task đó. Việc trùng giờ được xếp cạnh nhau. Nút **⤢** mở lịch lớn theo tuần.

**Khung giờ & nhắc việc** — mỗi task đặt được giờ bắt đầu, thời lượng và mốc nhắc trước (mặc định 30 phút), cả trong form tạo lẫn panel chi tiết. Giờ gắn với ngày hạn chót. Đến mốc nhắc thì app hiện toast, thêm thông báo vào **chuông** ở thanh trên và bắn thông báo hệ thống nếu đã cho phép. Nhắc việc chỉ chạy khi app đang mở.

**Nhật ký** — mỗi ngày một hoặc nhiều trang, viết tự do bằng trình soạn thảo giàu định dạng.

**Tổng quan** — tỉ lệ hoàn thành, số task trễ hạn, biểu đồ 7 ngày gần nhất, tiến độ trung bình, streak ngày viết nhật ký.

**Lọc và tìm** — theo mảng, theo lọc nhanh (hôm nay & trễ hạn, ưu tiên cao), theo tag, và tìm toàn văn trên tiêu đề / tag / ghi chú.

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

## Dữ liệu

Lưu vào `localStorage` mỗi lần thay đổi. Sidebar có chỉ báo thời điểm lưu gần nhất — nếu trình duyệt chặn ghi, chỉ báo chuyển đỏ và nhắc xuất file.

Ngoài ra:
- **Liên kết file trên ổ đĩa** (Chrome/Edge): chọn một file `.json`, từ đó mọi thay đổi tự ghi ra file thật. Handle được giữ trong IndexedDB nên lần mở sau chỉ cần bấm một nút để kết nối lại.
- **Xuất / Nạp file** JSON thủ công, dùng để backup hoặc chuyển sang máy khác.

Định dạng dữ liệu là JSON thuần: `{ tasks: [], journal: {}, settings: {} }`. Đọc được bằng mắt, sửa được bằng tay.

Có sẵn đường nâng cấp cho dữ liệu cũ: nhật ký định dạng cũ (một chuỗi mỗi ngày) tự chuyển thành dạng nhiều trang khi nạp; ghi chú viết bằng markdown hoặc HTML bản cũ được chuyển sang định dạng TipTap hiểu.

## Cấu trúc

```
run.bat                Bấm đúp là chạy: bật server tĩnh rồi mở trình duyệt
index.html             App hoàn chỉnh: CSS + HTML + bundle TipTap + code app
build/editor.src.js    Nguồn lớp bọc trình soạn thảo, xuất ra window.TT
build/build.js         esbuild bundle rồi nhúng thẳng vào index.html
build/bundle.js        Output trung gian của bước build
package.json           Chỉ phục vụ bước build (TipTap + esbuild)
RUN.md                 Cách chạy, build, và xử lý dữ liệu
```

Ranh giới quan trọng: code app chỉ gọi trình soạn thảo qua `window.TT`, không chạm trực tiếp vào ProseMirror. Nhờ vậy phần app vẫn là JavaScript thuần không cần build, và bundle TipTap là thứ duy nhất phải qua esbuild.

## Yêu cầu

Chạy app: một trình duyệt hiện đại. Không cần Node.

Build lại trình soạn thảo: Node (đã kiểm với v24) và `npm install`.

Giao diện và toàn bộ chú thích trong code viết bằng tiếng Việt.
