# CLAUDE.md

## Commit

Mỗi lần sửa xong một thay đổi (code hoặc tài liệu), **không tự commit**. Thay vào đó, ở cuối câu trả lời:

1. Soạn sẵn commit message bằng tiếng Việt, theo kiểu các commit trước trong `git log` (dòng tiêu đề ngắn, dưới là gạch đầu dòng nếu cần).
2. Liệt kê các file sẽ đưa vào commit.
3. Hỏi mình có muốn commit không. Chỉ commit khi mình đồng ý.

## Thư mục `data/`

`data/` là dữ liệu thật của mình: task, nhật ký, ghi chú. Nó nằm ngoài git và là chuyện riêng, không phải tài liệu của project.

- **Không đọc, không sửa, không xoá bất cứ file nào trong `data/`**, kể cả `data/backups/`. Không `cat`, `grep`, `sed`, `python`, không mở bằng công cụ đọc file, không viết script duyệt qua nó.
- Cần biết dữ liệu có hình dạng ra sao thì đọc `js/core.js` (khai báo `S`, `SETTINGS`, `FCFG`) hoặc `README.md`. Đừng mở file dữ liệu ra xem cho nhanh.
- Chạy `ls` để biết trong đó có file gì thì được, miễn là không mở nội dung ra.

**Ngoại lệ duy nhất: mình cho phép bằng lời trong chat.** Không tự suy ra sự cho phép từ việc mình nhờ sửa lỗi liên quan tới dữ liệu. Trước khi xin phép, phải nói rõ cả ba điều:

1. Cần mở file nào, xem phần nào, để làm gì — và vì sao không lấy được thông tin đó từ code.
2. **Rủi ro**: nội dung file sẽ đi vào ngữ cảnh của Claude, tức là được gửi lên server Anthropic và nằm lại trong transcript của phiên. Đã vào rồi thì không rút ra được, và nó có thể ảnh hưởng tới những câu trả lời sau trong cùng phiên. Một file dữ liệu hoặc một bản sao lưu là **toàn bộ** task, nhật ký, ghi chú — không phải một mẩu nhỏ.
3. Cách ít rủi ro hơn: mình tự trích đúng phần cần thiết dán vào chat, hoặc tự chạy lệnh rồi dán kết quả.

Mình đồng ý thì mới được mở, và chỉ mở đúng file đã xin. Cho phép một lần không phải là cho phép mãi — lần sau cần lại thì hỏi lại.
