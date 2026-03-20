# Web Document Archiver Extension

Đây là dự án cá nhân đầu tiên của mình, được thực hiện vào đầu năm nhất đại học nhằm mục đích tự động hóa việc tải tài liệu trên web thông qua thao tác chụp màn hình.

## 🤖 Quá trình phát triển với AI
Vì chưa có nhiều kinh nghiệm lập trình thực tế, dự án này được phát triển chủ yếu thông qua **Prompt Engineering** (Kỹ năng đặt câu lệnh cho AI). 
Thay vì tự viết code từ đầu, mình tập trung vào:
1. **Phân tích bài toán:** Xác định các bước cần thiết (ẩn các lớp phủ UI, cuộn trang, chụp ảnh, xử lý độ trễ).
2. **Giao tiếp với AI:** Chia nhỏ bài toán và yêu cầu AI sinh ra các đoạn mã JavaScript/Chrome API tương ứng.
3. **Thử nghiệm & Gỡ lỗi (Testing & Debugging):** Ráp nối các đoạn code, chạy thử trên trình duyệt, đọc lỗi và tiếp tục dùng AI để sửa lỗi cho đến khi công cụ hoạt động trơn tru.

## 💡 Bài học rút ra
- Hiểu được cách hoạt động cơ bản của một Browser Extension (manifest.json, content scripts).
- Làm quen với việc đọc hiểu mã nguồn do AI tạo ra và cách gỡ lỗi logic cơ bản.
- Rèn luyện tư duy hệ thống: biết cách biến một ý tưởng giải quyết khó khăn thực tế thành một công cụ phần mềm.

## 🛠 Công cụ sử dụng
- Generative AI (dùng để sinh mã nguồn)
