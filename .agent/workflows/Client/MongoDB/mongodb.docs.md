---
description: MongoDB Atlas Connection Guide
---

# Hướng dẫn Kết nối MongoDB Atlas

Tài liệu này mô tả chi tiết quy trình kết nối Server với MongoDB Atlas, từ việc lấy Connection String đến implementation trong code.

---

## 1. Thiết lập trên MongoDB Atlas (Cloud)

Trước khi chạy code, bạn cần có một Cluster trên MongoDB Atlas.

### Bước 1: Lấy Connection String
1.  Đăng nhập vào [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2.  Chọn Cluster dự án của bạn (ví dụ: `Cluster0`).
3.  Bấm nút **Connect**.
4.  Chọn **Drivers** (Node.js, version mới nhất).
5.  Copy chuỗi kết nối (`Connection String`).
    *   Dạng: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

### Bước 2: Cấu hình User & Network Access
1.  **Database Access:** Vào tab "Database Access" -> "Add New Database User" -> Tạo user/pass (ví dụ: `huynl`/`...`).
2.  **Network Access:** Vào tab "Network Access" -> "Add IP Address" -> Chọn "Allow Access from Anywhere" (0.0.0.0/0) để dev local, hoặc whitelist IP Server cụ thể.

---

## 2. Cấu hình Code Local (`/server`)

### Bước 1: Cập nhật biến môi trường
Mở file `server/.env` và cập nhật biến `MONGO_URI`.

```env
# server/.env
# Thay <password> bằng mật khẩu thật, <username> bằng tên user đã tạo.
# Thêm tên database vào sau dấu / (ví dụ: ...mongodb.net/unilish?...)
MONGO_URI=mongodb+srv://huynl:PASSWORD_CUA_BAN@cluster0.xdwjh69.mongodb.net/unilish?appName=Cluster0
```

### Bước 2: Kiểm tra Code Kết nối
Code kết nối đã được cài đặt sẵn tại `server/src/config/db.ts` và `server/src/server.ts`.

#### `server/src/config/db.ts`
Đây là nơi thực hiện logic kết nối sử dụng thư viện Mongoose.

```typescript
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
    try {
        // Mongoose 6+ không cần các options deprecated (useNewUrlParser, etc)
        const conn = await mongoose.connect(env.MONGO_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // Nếu lỗi kết nối, log và tắt server ngay lập tức để báo động
        logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
```

#### `server/src/server.ts`
Hàm `connectDB()` được gọi khi khởi động server, đảm bảo database kết nối thành công TRƯỚC KHI server bắt đầu lắng nghe request.

```typescript
const startServer = async () => {
    // 1. Kết nối DB
    await connectDB(); 
    
    // 2. Kết nối Redis
    await connectRedis();

    // 3. Start Express Server
    const server = app.listen(PORT, () => { ... });
};
```

---

## 3. Debug & Troubleshooting

### Lỗi thường gặp:

1.  **`MongoServerError: bad auth : Authentication failed`**
    *   **Nguyên nhân:** Sai `username` hoặc `password` trong `MONGO_URI`.
    *   **Sửa:** Kiểm tra kỹ password trong file `.env`. Lưu ý nếu password có ký tự đặc biệt (`@`, `:`, `/`) cần được [URL Encode](https://www.urlencoder.org/) (ví dụ `@` thành `%40`).

2.  **`MongoNetworkError: connection timed out`**
    *   **Nguyên nhân:** IP của máy bạn chưa được Whitelist trên MongoDB Atlas.
    *   **Sửa:** Vào Atlas -> Network Access -> Add Current IP Address.

3.  **`MongooseServerSelectionError: connect ECONNREFUSED`**
    *   **Nguyên nhân:** Mạng chặn port 27017 hoặc Connection String sai host.
    *   **Sửa:** Thử đổi mạng (một số Wifi công ty firewall chặn MongoDB).

---

## 4. Best Practices

*   **Security:** KHÔNG BAO GIỜ commit file `.env` lên Git.
*   **Performance:**
    *   Trong `read` operations, luôn dùng `.lean()` để trả về Plain JS Object thay vì Mongoose Document nặng nề.
    *   Luôn dùng `.select()` để chỉ lấy các field cần thiết.
    *   Đánh Index cho các field hay query (ví dụ: `email`, `slug`).

```typescript
// Ví dụ Query tốt
const user = await User.findOne({ email }).select('fullName role').lean();
```
