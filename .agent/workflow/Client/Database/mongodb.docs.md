---
description: MongoDB Atlas Connection Guide
---

# Hướng dẫn kết nối MongoDB Atlas

Tài liệu này hướng dẫn quy trình kết nối MongoDB Atlas theo chuẩn doanh nghiệp, tập trung vào bảo mật, độ tin cậy, và vận hành ổn định.

---

## 1. Thiết lập trên MongoDB Atlas

### 1.1 Tạo Cluster
1. Dang nhap [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2. Tao cluster theo moi truong (dev, staging, production) va bat backup tu dong.
3. Dat ten cluster theo convention (vi du: unilish-dev, unilish-prod).

### 1.2 Tao Database User (Least Privilege)
1. Vao Database Access -> Add New Database User.
2. Tao user rieng cho tung moi truong, khong dung chung tai khoan.
3. Phan quyen toi thieu can thiet (readWrite cho dev, readWriteAnyDatabase chi khi bat buoc).

### 1.3 Cau hinh Network Access
1. Vao Network Access -> Add IP Address.
2. Dev: chi allow IP cua developer, khong dung 0.0.0.0/0.
3. Prod: allow IP cua server hoac VPC peering theo guideline an ninh.

### 1.4 Lay Connection String
1. Chon cluster -> Connect -> Drivers -> Node.js.
2. Copy Connection String, mau:
   `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
3. Them ten database sau domain (vi du: `/unilish`).

---

## 2. Cau hinh ung dung (Server)

### 2.1 Bien moi truong
Cap nhat `server/.env` (khong commit len Git).

```env
MONGO_URI=mongodb+srv://unilish_user:PASSWORD@cluster0.xdwjh69.mongodb.net/unilish?appName=Cluster0
```

### 2.2 Ket noi trong code
Code ket noi da duoc cau hinh san tai `server/src/config/database.mongo.ts` va `server/src/server.ts`.

```typescript
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(env.MONGO_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
```

```typescript
const startServer = async () => {
    await connectDB();
    await connectRedis();
    const server = app.listen(PORT, () => { ... });
    // Graceful shutdown closes MongoDB and Redis connections.
};
```

---

## 3. Van hanh va bao mat

### 3.1 Tieu chuan bao mat
- Khong commit `.env` va khong hardcode credentials.
- Su dung user rieng cho moi moi truong.
- Bat MFA cho tai khoan Atlas admin.
- Su dung IP allowlist hoac VPC peering cho prod.

### 3.2 Backup va phuc hoi
- Bat automated backups cho production.
- Kiem tra restore point hang thang.
- Ghi ro RPO/RTO cho tung moi truong.

### 3.3 Giam sat va canh bao
- Bat Atlas Alerts (CPU, memory, disk, connections).
- Ghi nhan slow queries va index suggestion tu Atlas.

---

## 4. Debug va Troubleshooting

1. `MongoServerError: bad auth : Authentication failed`
   - Nguyen nhan: Sai username/password.
   - Xu ly: Kiem tra `.env`, neu password co ky tu dac biet can URL Encode.

2. `MongoNetworkError: connection timed out`
   - Nguyen nhan: IP chua duoc allowlist.
   - Xu ly: Cap nhat Network Access tren Atlas.

3. `MongooseServerSelectionError: connect ECONNREFUSED`
   - Nguyen nhan: Connection String sai host hoac mang chan port 27017.
   - Xu ly: Kiem tra DNS, doi mang, hoac kiem tra firewall cong ty.

---

## 5. Best Practices (Enterprise)

- Luon su dung `.lean()` va `.select()` cho truy van read.
- Tao index cho cac truong query nhieu (email, role, subscription.plan).
- Giam so luong field tra ve de toi uu bang thong.

```typescript
const user = await User.findOne({ email })
    .select('fullName role subscription')
    .lean();
```
