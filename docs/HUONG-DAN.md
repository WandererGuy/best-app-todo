# Hướng dẫn chi tiết

Mô tả đầy đủ từng tính năng của Trung tâm điều khiển. Cách cài đặt, chạy và sao lưu: xem [README](../README.md).

## Mục lục

- [Ý tưởng](#ý-tưởng)
- [Các tính năng](#các-tính-năng)
- [Trình soạn thảo](#trình-soạn-thảo)
- [Cách app lưu dữ liệu](#cách-app-lưu-dữ-liệu)
- [Định dạng dữ liệu](#định-dạng-dữ-liệu)

## Ý tưởng

Một chỗ duy nhất cho việc cần làm và cho suy nghĩ về việc đó. Task không chỉ là một dòng tiêu đề — mỗi task có một ô ghi chú viết được như trang Notion, để mọi thứ vụn vặt liên quan đến nó có nơi để ném vào thay vì tản mác ở chỗ khác.

Ràng buộc tự đặt: **chạy offline, dữ liệu là của người dùng, nằm ở một file cầm nắm được**. Điều này quyết định mọi lựa chọn kỹ thuật bên dưới. Ban đầu app không có backend và chỉ lưu trong `localStorage`, nhưng như vậy dữ liệu bị nhốt trong một profile trình duyệt: xoá cache là mất, đổi tài khoản Chrome là không thấy. Nên `serve.py` giờ giữ dữ liệu ra file — vẫn chỉ chạy trên máy, chỉ nghe `localhost`.

## Các tính năng

**Bảng việc** — 3 cột `Cần làm / Đang làm / Xong`, kéo thả giữa các cột. Mỗi task có: mảng (Công việc / Cuộc sống / Khác), ưu tiên (Thấp / Trung bình / Cao), phần trăm tiến độ, hạn chót, tag, danh sách việc con, và ghi chú.

**Bảng cuộc sống** — bảng kanban riêng cho task mảng Cuộc sống, cùng kiểu với Bảng việc. Bảng việc chỉ còn mảng Công việc và Khác. Hai bảng dùng chung lịch, nhắc việc và tổng quan.

**Để sau** — chỗ cho việc chưa cam kết làm, dùng chung cho mọi mảng. Task ở đây không lên bảng, lịch, nhắc việc và không tính vào tổng quan. Gõ vào ô trên cùng rồi Enter để ghi nhanh; mỗi dòng hiện tuổi tính từ ngày tạo và nút **→ Cần làm** để đưa lên cuối cột Cần làm. Chiều ngược lại: kéo card trên bảng thả vào mục **Để sau** ở sidebar, hoặc chọn trạng thái **Để sau** trong panel task / form tạo task.

**Thói quen** — việc lặp lại vào những thứ cố định trong tuần, theo dõi riêng chứ không nằm trên bảng: task là việc làm một lần rồi xong, thói quen là chuỗi không có điểm kết thúc, và nếu để chung thì bảng sẽ ngập còn Tổng quan sẽ bị nhiễu. Mỗi thói quen có tên, màu, loại (**Nên làm** / **Nên bỏ**), các thứ trong tuần phải làm, và một câu **ý định thực hiện** dạng "sau việc gì, ở đâu" — thứ có tác dụng mạnh nhất trong các nghiên cứu về hình thành thói quen. Thói quen muốn bỏ thì khai báo thêm **hành vi thay thế**: cơn thèm vẫn đến, cái đổi được là phản ứng, nên bạn tick những ngày dùng được hành vi thay thế.

Mỗi thói quen có mục **Lý do** — vì sao nó đáng làm, thứ bạn sẽ cần đọc lại vào đúng hôm không muốn làm. Đây là một ô soạn thảo đầy đủ như ghi chú task (gõ `/` để chèn khối, dán được ảnh và file), có ở hai chỗ: trong form tạo / sửa, nằm cùng các trường khác và chỉ lưu khi bấm **Lưu**; và trên thẻ dưới dạng dòng **▸ Lý do** gập / mở được, sửa là lưu ngay. Gập lại thì chỉ còn một dòng xem trước, và app nhớ bạn đang để nó mở hay gập.

Mỗi thẻ có lưới 12 tuần kiểu biểu đồ đóng góp — cột là tuần, hàng là thứ, nhìn dọc thấy ngay mình hay đứt vào thứ mấy. Bấm một ô để đánh dấu hoặc bỏ đánh dấu ngày đó. Thẻ hiện **chuỗi buổi liên tiếp** và **tỉ lệ làm được**; bỏ lỡ một buổi thì app không phạt, bỏ buổi thứ hai liên tiếp mới cảnh báo — vì bỏ một lần gần như không ảnh hưởng đến quá trình thành tự động, bỏ liên tiếp mới là lúc thói quen chết.

Những thói quen **đến hạn hôm nay** hiện thành một dải tick nhanh ở đầu Bảng việc và Bảng cuộc sống, kèm số buổi liên tiếp. Tick xong có một nhịp mừng ngắn: cảm xúc tích cực tức thì mới là thứ gắn hành vi thành thói quen, không phải số lần lặp.

**Tập trung** — đồng hồ pomodoro để làm việc sâu, chống nhảy việc. Mặc định 40 phút làm, 10 phút nghỉ, nghỉ dài 15 phút sau mỗi 3 phiên; mọi thông số đều đổi được ở **⚙ Cài đặt** trong mục Tập trung, nhóm nào cũng có nút **Khôi phục mặc định**. Đổi thời lượng khi đồng hồ đang chạy thì chỉ áp dụng từ phiên sau — đã bấm bắt đầu là giữ đúng lịch.

- **Hàng đợi** tối đa 3 task (đổi được), **chỉ nhận task ở cột Đang làm**: kéo card Đang làm thả vào khối Tập trung ở sidebar, hoặc chọn trong mục Tập trung — danh sách chọn chia nhóm theo ưu tiên, cao lên đầu, và mỗi task trong hàng đợi có nhãn ưu tiên. Task đầu hàng là task của phiên tới. Mỗi phiên gắn đúng một task — đổi task giữa phiên phải xác nhận và được ghi là một lần chuyển ngữ cảnh, trừ khi task cũ đã xong. Task rời cột Đang làm (xong, về Cần làm, bị gác lại hay bị bỏ) thì tự rời hàng đợi.
- **Khối ở sidebar** hiện đồng hồ, task và nút bắt đầu / tạm dừng. Thấy vướng mắt thì bấm **Thu gọn** cạnh nhãn Tập trung: khối chỉ còn một dòng mảnh với pha và giờ còn lại, bấm vào dòng đó để mở lại.
- **Trong phiên**: chợt nhớ việc khác thì gõ vào ô **Ghi để sau** (ở mục Tập trung hoặc màn hình toàn màn hình) rồi Enter — việc vào mục Để sau, mình quay lại việc đang làm. **⏸ Tạm dừng** khi phải rời việc; dừng quá 2 phút thì app hỏi làm tiếp hay huỷ phiên.
- **Hết phiên**: chuông (tự tổng hợp, chỉnh âm lượng được), thông báo hệ thống nếu đã cho phép, rồi chấm độ tập trung 1–5 và viết **Ghi chú sau phiên** — câu này hiện lại lần sau chuẩn bị làm task đó. Giờ nghỉ có gợi ý việc rời màn hình; bỏ nghỉ được nhưng app vẫn ghi lại.
- **Làm bù** (mặc định tắt, đặt số phút ở nhóm **Thời lượng**): đang vào mạch mà hết giờ thì không phải dừng ngang. Hết giờ app chỉ kêu chuông, đồng hồ đổi sang tông hổ phách và đếm lên phần làm thêm (**+03:20**); làm nốt rồi bấm **✓ Kết thúc phiên**, hoặc để đó — hết số phút đã đặt thì đồng hồ tự ngừng. Phần bù tính hết vào giờ tập trung của ngày (nhật ký ghi "bù thêm 12′"), nhưng **cây đã chốt ở mức lúc vừa đủ giờ** nên làm thêm không được thưởng thêm. Phiên vẫn là một phiên đạt; câu mừng, chấm điểm và giờ nghỉ chờ tới lúc kết thúc thật. App tắt giữa phần bù thì chỉ tính tối đa đúng số phút cho phép.
- **Chuỗi**: ngày thường đạt khi làm đủ 2 phiên. Được lỡ 1 ngày thường, lỡ 2 ngày liên tiếp mới về 0. Cuối tuần không làm thì chuỗi không gãy, có làm đủ thì vẫn cộng. Phiên huỷ giữa chừng được ghi lại (kèm số phút đã làm) nhưng không tính là phiên đạt.
- **Khu vườn**: mỗi phiên đủ giờ trồng một cây, phiên huỷ giữa chừng để lại cây héo. Chọn loài cây ngay trên đồng hồ trước khi bắt đầu (8 loài: Thông, Sồi, Anh đào, Phong đỏ, Bạch dương, Cọ, Xương rồng, Tre), app nhớ loài chọn lần trước. Cây lên cấp theo số phút: dưới 15, từ 15, từ 40 — đang chạy thì cây trên đồng hồ tự lớn, nhưng phần làm bù không tính vào đây. Rê chuột vào cây để xem task, giờ và số phút của phiên đó.
- **Biểu đồ giờ tập trung** và khu vườn xem theo **Ngày / Tuần / Tháng / Năm**, nút ‹ › để lùi tiến; app nhớ kiểu xem đã chọn. Xem theo ngày thì biểu đồ chia 24 cột theo giờ. Biểu đồ tính mọi phiên, kể cả bỏ dở, vì thời gian đó vẫn là đã ngồi làm.
- **Toàn màn hình** (nút **⤢**, Esc để thoát): giữa màn hình chỉ còn đồng hồ và nút; tên task và ô ghi để sau nằm trong ngăn nhỏ góc trên bên trái, mặc định gập lại, bấm **▸** để mở. Nền đổi theo **Tập trung / Nghỉ ngắn / Nghỉ dài**, mỗi pha có màu nền, ảnh nền (giữ phần trong suốt của PNG) với độ rõ chỉnh được, và lớp phủ tối hoặc sáng để chữ luôn dễ đọc.

Đồng hồ tính theo mốc thời gian chứ không đếm nhịp, nên F5, chuyển tab hay tắt app giữa phiên đều không lệch; phiên hết giờ lúc app đang tắt được ghi nhận khi mở lại. Đồng hồ hiện cả trên tiêu đề tab. Mục Tập trung có tiến độ hôm nay, 7 ngày gần nhất, tuần, tháng, chuỗi dài nhất, và tổng kết trong ngày (phút tập trung, số task, số lần ghi để sau, số lần tạm dừng, điểm tập trung trung bình, danh sách phiên).

**Tag** — danh sách tag dùng chung, mỗi tag một màu riêng. Bấm **Quản lý** cạnh mục Tag ở sidebar để thêm, đổi tên, xoá tag và đổi màu — chọn từ bảng 72 màu hoặc màu bất kỳ (bộ chọn màu / mã hex). Đổi tên trùng một tag có sẵn thì app hỏi gộp hai tag. Khi gắn tag cho task, các tag đã có hiện sẵn để bấm chọn lại; gõ tên mới rồi Enter sẽ tạo tag mới.

**Panel task** — bấm vào task để mở drawer bên phải: sửa mọi trường, tick việc con, viết ghi chú.

**Lịch** — ba chế độ **Ngày / Tuần / Tháng** (app nhớ chế độ chọn gần nhất). Ngày và Tuần là lưới giờ kiểu Google Calendar: task có giờ nằm đúng khung giờ, task chỉ có ngày hạn nằm ở hàng "Cả ngày". Bấm khung trống để tạo task vào giờ đó, bấm tên ngày để xem riêng ngày đó. Tháng là lưới tháng: task hiện ở đúng ngày hạn chót, ngày có nhật ký được đánh dấu.

**Lịch ngày ở sidebar** — dòng thời gian 24 giờ kiểu Google Calendar, chia ô 30 phút. Bấm ô trống để mở form tạo task, ngày và giờ được điền sẵn. Bấm vào một block để mở task đó. Việc trùng giờ được xếp cạnh nhau. Nút **⤢** mở lịch lớn theo tuần.

**Khung giờ & nhắc việc** — mỗi task đặt được giờ bắt đầu, thời lượng và mốc nhắc trước (mặc định 30 phút), cả trong form tạo lẫn panel chi tiết. Giờ gắn với ngày hạn chót. Đến mốc nhắc thì app hiện toast, thêm thông báo vào **chuông** ở thanh trên và bắn thông báo hệ thống nếu đã cho phép. Nhắc việc chỉ chạy khi app đang mở.

**Nhật ký** — mỗi ngày một hoặc nhiều trang, viết tự do bằng trình soạn thảo giàu định dạng.

**Ghi chú** — trang không gắn với ngày, lồng nhau như Notion. Cột trái là cây trang: bấm ▸ để mở trang con, rê chuột vào một trang rồi bấm **+** để thêm trang con. Mỗi trang có tiêu đề, tag (dùng chung với task), nội dung soạn bằng cùng trình soạn thảo, **ngày tạo** và **sửa lần cuối** (cập nhật khi đổi tiêu đề, nội dung hoặc tag). Ghim trang để nó hiện ở mục **Đã ghim** trên đầu cây; **Chuyển vào…** để đưa trang (kèm trang con) vào trang khác hoặc về cấp gốc. Gõ vào ô tìm kiếm hoặc bấm một tag ở sidebar thì cây thành danh sách trang khớp, mới sửa lên đầu. Bỏ một trang thì cả các trang con cùng vào **Thùng rác**, khôi phục cũng khôi phục cả cây.

**Tổng quan** — tỉ lệ hoàn thành, số task trễ hạn, biểu đồ 7 ngày gần nhất, tiến độ trung bình, streak ngày viết nhật ký, và số thói quen đã tick hôm nay.

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

## Cách app lưu dữ liệu

Mỗi thay đổi được ghi ra **`data/dieukhien.json`** (qua `serve.py`, sau ~0.8 giây). `localStorage` chỉ còn là bản đệm, nên xoá cache hay mở bằng tài khoản Chrome khác vẫn thấy đủ dữ liệu. Sidebar báo **Đã lưu vào máy** kèm giờ; không ghi được thì chuyển đỏ và hiện banner.

- **Sao lưu tự động** trong `data/backups/`: bản đầu mỗi ngày (`ngay-*.json`, giữ 30 ngày); bản ngay trước khi nạp file (`truoc-khi-nap-*`); dữ liệu trình duyệt không được dùng (`trinh-duyet-*`). Muốn khôi phục thì dùng **Nạp file** với file trong đó.
- **Hai cửa sổ không đè nhau.** Mỗi lần ghi kèm mã phiên bản; cửa sổ / profile khác đã ghi trước thì server từ chối, bản của cửa sổ này được cất vào `data/backups`, app báo tải lại trang.
- **Lần đầu mở bản này trên profile có dữ liệu cũ**, khi `data/dieukhien.json` chưa có: app hỏi có dùng dữ liệu trong trình duyệt làm dữ liệu chính không (có ghi số task). Profile khác có dữ liệu riêng chưa từng lên file thì không hỏi — dữ liệu đó được cất vào `data/backups`, app dùng dữ liệu trong file.
- Server tắt giữa chừng: thay đổi vẫn giữ trong trình duyệt và được đánh dấu, lần mở sau khi server chạy lại sẽ tự gửi lên.

Ngoài ra:
- **Liên kết file trên ổ đĩa** (Chrome/Edge): chọn một file `.json`, từ đó mọi thay đổi tự ghi ra file thật. Handle được giữ trong IndexedDB nên lần mở sau chỉ cần bấm một nút để kết nối lại.
- **Xuất / Nạp file** JSON thủ công, dùng để backup hoặc chuyển sang máy khác.

## Định dạng dữ liệu

Định dạng dữ liệu là JSON thuần: `{ tasks: [], journal: {}, notes: [], habits: [], focus: {}, settings: {} }`. Đọc được bằng mắt, sửa được bằng tay.

`focus.log` giữ mọi phiên và giờ nghỉ đã qua, kể cả bị huỷ, để sau này phân tích: `k` (`work` / `short` / `long`), `a` / `b` (mốc bắt đầu / kết thúc, ms), `plan` (phút dự kiến), `ms` (thời gian chạy thật — có thể lớn hơn `plan` nếu làm bù), `done` (chạy đủ giờ). Phiên làm việc có thêm `tid`, `title`, `rate` (1–5), `next`, `pause` (số lần tạm dừng), `cap` (số lần ghi để sau), `sw` (số lần đổi task), `paused` (tổng thời gian dừng, ms). Ảnh nền màn hình tập trung cũng được gói vào trường `images`.

Ảnh và file đính kèm không nằm trong `localStorage` (giới hạn ~5MB) mà trong IndexedDB; ghi chú chỉ giữ `<img data-img="mã">` / `<div data-file="mã" data-name data-size>`. File xuất ra và file liên kết có thêm trường `images: {mã: data URL}` chứa các ảnh và file đang được dùng (tên trường giữ nguyên để backup cũ vẫn nạp được), nên backup có đủ ảnh; nạp file sẽ đưa ảnh trở lại IndexedDB.

Có sẵn đường nâng cấp cho dữ liệu cũ: nhật ký định dạng cũ (một chuỗi mỗi ngày) tự chuyển thành dạng nhiều trang khi nạp; ghi chú viết bằng markdown hoặc HTML bản cũ được chuyển sang định dạng TipTap hiểu.
