# 📱 HƯỚNG DẪN CẤU HÌNH BOT ZALO OA & GỬI TIN NHẮN CẢNH BÁO
## HỆ THỐNG BÁO CHÁY AI (CANH_BAO_CHAY_ZALO)

Hệ thống hỗ trợ gửi tin nhắn cảnh báo tự động kèm ảnh chụp hiện trường đám cháy đến tối đa **10 tài khoản / Bot Zalo** khác nhau.

---

## 🛠️ 1. CÁC BƯỚC TẠO ZALO OFFICIAL ACCOUNT (OA) & LẤY ACCESS TOKEN

### Bước 1: Đăng ký Zalo Official Account (OA)
1. Truy cập trang quản trị Zalo OA: [https://oa.zalo.me/manage](https://oa.zalo.me/manage)
2. Đăng nhập bằng tài khoản Zalo của bạn và chọn **"Tạo Official Account mới"**.
3. Chọn loại tài khoản **"Doanh nghiệp"** hoặc **"Cơ quan nhà nước"** và điền thông tin (Tên OA: ví dụ *Hệ thống Cảnh báo Cháy PCCC*).

### Bước 2: Tạo Ứng dụng Zalo (Zalo App) trên Zalo for Developers
1. Truy cập: [https://developers.zalo.me](https://developers.zalo.me)
2. Đăng nhập và chọn **"Thêm ứng dụng mới"**.
3. Điền tên ứng dụng (ví dụ: *FireGuard AI Bot*) và chọn **Tạo App ID**.
4. Vào mục **Cài đặt ➔ Thông tin cơ bản** để lấy:
   - **App ID**
   - **Khóa bí mật của ứng dụng (Secret Key)**

### Bước 3: Liên kết Zalo App với Zalo OA & Lấy Access Token
1. Trong trang Zalo for Developers, vào mục **Official Account ➔ Quản lý OA**.
2. Bấm **"Liên kết OA"** và chọn Zalo OA vừa tạo ở Bước 1.
3. Vào mục **Công cụ ➔ Tạo Access Token (Token Generator)**:
   - Chọn Zalo OA cần cấp quyền.
   - Tích chọn quyền: `oa.message.cs` (Gửi tin nhắn chăm sóc khách hàng) và `oa.message.transaction` (Gửi tin nhắn giao dịch/thông báo).
   - Bấm **"Tạo Access Token"** và sao chép mã **Access Token** & **Refresh Token**.

### Bước 4: Lấy Zalo User ID của người nhận
1. Mở ứng dụng Zalo trên điện thoại của người cần nhận tin cảnh báo.
2. Tìm kiếm và bấm **"Quan tâm"** Zalo OA vừa tạo.
3. Gửi 1 tin nhắn bất kỳ (ví dụ: "Xin chào") đến Zalo OA.
4. Trong trang quản trị Zalo OA (mục Quản lý khách hàng / Chat), bạn sẽ thấy mã **User ID (ID người dùng)** của tài khoản đó.

---

## ☁️ 2. CẤU HÌNH LƯU TRỮ ẢNH ĐÁM CHÁY IMGBB (TÙY CHỌN)

Để tin nhắn Zalo gửi kèm được ảnh chụp khoảnh khắc đám cháy rõ nét:
1. Đăng ký tài khoản miễn phí tại: [https://imgbb.com](https://imgbb.com)
2. Truy cập: [https://api.imgbb.com](https://api.imgbb.com) và bấm **"Get API Key"**.
3. Sao chép chuỗi **API Key** (gồm 32 ký tự).

---

## ⚙️ 3. NHẬP CẤU HÌNH VÀO WEB BÁO CHÁY

1. Mở trình duyệt Web Báo Cháy tại: `http://localhost:3000/settings`
2. Chọn tab **"Bot Zalo & ImgBB"**:
   - Dán **ImgBB API Key** và bấm Lưu cấu hình chung.
   - Bấm **"Thêm Bot Zalo"**:
     - Tên Bot: ví dụ *Bot 1: Đội PCCC cơ sở*
     - User ID người nhận: Dán User ID lấy ở Bước 4.
     - Access Token: Dán mã Access Token lấy ở Bước 3.
     - Tích chọn: **"Kích hoạt nhận tin ngay"**.
     - Bấm **"Lưu Bot Zalo"**.
3. Bấm nút **"Test"** bên cạnh Bot Zalo vừa tạo:
   - Hệ thống sẽ gửi ngay một tin nhắn thử nghiệm tới điện thoại Zalo của bạn.
   - Nếu điện thoại nhận được tin nhắn $\rightarrow$ **Cấu hình thành công 100%!**
