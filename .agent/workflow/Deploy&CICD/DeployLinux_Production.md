# Hướng dẫn Deploy Unilish lên Production (Home Server + Cloudflare Tunnel)

> **`cloudflared` & domain `devenir.shop` đã cài sẵn từ dự án Devenir.**
> Chỉ cần tạo thêm tunnel `unilish` và thêm 3 subdomain mới vào `devenir.shop`.

**Subdomains sẽ dùng:**

| Service | URL |
|---------|-----|
| 🌐 Client | `https://unilish.devenir.shop` |
| ⚙️ Admin | `https://admin-unilish.devenir.shop` |
| 🔌 API | `https://api-unilish.devenir.shop` |

---

## 📋 Yêu cầu trước khi bắt đầu

- ✅ `cloudflared` đã cài (từ Devenir)
- ✅ Domain `devenir.shop` đã trỏ Cloudflare
- ✅ Docker & Docker Compose đã cài đặt
- ✅ Source code Unilish đã clone về server

---

## 🚀 Các bước thực hiện

### **Bước 1: Clone Source Code lên Server**

```bash
git clone <your-repo-url> ~/unilish
cd ~/unilish
```

---

### **Bước 2: Tạo Tunnel mới tên "unilish"**

```bash
# Tạo tunnel riêng (độc lập với tunnel devenir)
cloudflared tunnel create unilish
# → Ghi lại Tunnel UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

### **Bước 3: Map 3 Subdomain về Tunnel**

> **Lưu ý Quan Trọng:** Vì server đã có tunnel của dự án Devenir, bạn LẮT BUỘC phải dùng `TUNNEL_UUID` (ví dụ: `e60a5f70-...`) kèm cờ `-f` để map đúng tunnel, nếu không request sẽ trỏ nhầm sang Admin của Devenir gây ra lỗi 404!

```bash
# Thay <TUNNEL_UUID> bằng UUID thật của tunnel unilish sinh ra ở bước 2

# Client
cloudflared tunnel route dns -f <TUNNEL_UUID> unilish.devenir.shop

# Admin
cloudflared tunnel route dns -f <TUNNEL_UUID> admin-unilish.devenir.shop

# API
cloudflared tunnel route dns -f <TUNNEL_UUID> api-unilish.devenir.shop
```

> Sau bước này, Cloudflare DNS sẽ tự động cập nhật CNAME trỏ về Tunnel mới.  
> Kiểm tra tại **Cloudflare Dashboard → devenir.shop → DNS → Records**.

---

### **Bước 4: Tạo Config File riêng cho Unilish**

Tạo `~/.cloudflared/unilish-config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /home/<username>/.cloudflared/<TUNNEL_UUID>.json

ingress:
  # Client → port 5176 (tránh đụng 5173 của Devenir)
  - hostname: unilish.devenir.shop
    service: http://localhost:5176

  # Admin → port 5175 (tránh đụng 5174 của Devenir)
  - hostname: admin-unilish.devenir.shop
    service: http://localhost:5175

  # API → port 5432 (Express + Socket.IO)
  - hostname: api-unilish.devenir.shop
    service: http://localhost:5432
    originRequest:
      connectTimeout: 30s
      keepAliveConnections: 100
      keepAliveTimeout: 90s
      # Bắt buộc: HTTP/1.1 để WebSocket (Socket.IO) hoạt động đúng
      http2Origin: false

  # Catch-all (bắt buộc)
  - service: http_status:404
```

> Thay `<TUNNEL_UUID>` và `<username>` bằng giá trị thực tế của bạn.

---

### **Bước 5: Tạo Systemd Service riêng cho Unilish Tunnel**

Vì Devenir đã chiếm `cloudflared.service`, tạo service mới độc lập:

```bash
sudo nano /etc/systemd/system/cloudflared-unilish.service
```

Nội dung:

```ini
[Unit]
Description=Cloudflare Tunnel - Unilish
After=network.target

[Service]
Type=simple
User=<username>
ExecStart=/usr/bin/cloudflared tunnel --config /home/<username>/.cloudflared/unilish-config.yml run unilish
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
# Thay <username> bằng user thực tế (VD: huy, ubuntu, root)
sudo systemctl daemon-reload
sudo systemctl start cloudflared-unilish
sudo systemctl enable cloudflared-unilish

# Kiểm tra
sudo systemctl status cloudflared-unilish
sudo journalctl -u cloudflared-unilish -f --no-pager
```

---

### **Bước 6: Cấu hình Environment Variables**

**`server/.env`:**

```env
NODE_ENV=production
PORT=5432
REDIS_URI=redis://redis:6379
CLIENT_URL=https://unilish.devenir.shop

MONGODB_URI=mongodb+srv://...
PINECONE_API_KEY=...
CLERK_SECRET_KEY=...
# ... các key khác
```

**`client/.env.production`:**

```env
VITE_API_URL=https://api-unilish.devenir.shop/api
VITE_SOCKET_URL=https://api-unilish.devenir.shop
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

**`admin/.env.production`:**

```env
VITE_API_URL=https://api-unilish.devenir.shop
```

---

### **Bước 7: Update CORS trong Server**

`server/src/middlewares/security/cors.ts`:

```typescript
const allowedOrigins = [
  // Development
  "http://localhost:5173",
  "http://localhost:5174",
  // Production
  "https://unilish.devenir.shop",
  "https://admin-unilish.devenir.shop",
  "https://api-unilish.devenir.shop",
];
```

---

### **Bước 8: Cập nhật `docker-compose.prod.yml`**

Do chạy chung server với Devenir, cần đổi exposed ports của Client và Admin ra bên ngoài thành **5176** và **5175** để không bị lỗi `port is already allocated`.

```yaml
  server:
    ports:
      - "5432:5432"
    environment:
      - PORT=5432
      - REDIS_URI=redis://redis:6379
      - SERVER_URL=https://api-unilish.devenir.shop
      - CLIENT_URL=https://unilish.devenir.shop
      - ADMIN_URL=https://admin-unilish.devenir.shop
      - NODE_ENV=production

  client:
    ports:
      - "5176:80"
    build:
      args:
        - VITE_API_URL=https://api-unilish.devenir.shop/api
        - VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}

  admin:
    ports:
      - "5175:80"
    build:
      args:
        - VITE_API_URL=https://api-unilish.devenir.shop
```

---

### **Bước 9: Build & Start Docker Containers**

```bash
cd ~/unilish

docker compose -f docker-compose.prod.yml up -d --build

# Verify — tất cả phải Up
docker compose -f docker-compose.prod.yml ps
```

Kết quả mong muốn:

```
NAME                    STATUS
unilish-redis-prod      Up (healthy)
unilish-server-prod     Up
unilish-client-prod     Up
unilish-admin-prod      Up
```

---

## ✅ Kết quả sau khi Deploy

| Service | URL |
|---------|-----|
| 🌐 **Client** | https://unilish.devenir.shop |
| ⚙️ **Admin** | https://admin-unilish.devenir.shop |
| 🔌 **API** | https://api-unilish.devenir.shop |

DNS Records mới sẽ xuất hiện trong Cloudflare Dashboard cùng với các record của Devenir.

---

## 🔧 Quản lý Hệ thống

### Deploy update (khi có code mới)

```bash
cd ~/unilish
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Logs & Debug

```bash
# Docker logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f server

# Tunnel logs
sudo journalctl -u cloudflared-unilish -f --no-pager

# Kiểm tra tất cả tunnels
cloudflared tunnel list
```

### Restart

```bash
# Docker
docker compose -f docker-compose.prod.yml restart

# Unilish Tunnel
sudo systemctl restart cloudflared-unilish

# Cả 2
docker compose -f docker-compose.prod.yml restart && sudo systemctl restart cloudflared-unilish
```

---

## 🔄 Auto-start sau khi Server reboot

```bash
sudo systemctl enable docker
sudo systemctl enable cloudflared          # Devenir (đã có)
sudo systemctl enable cloudflared-unilish  # Unilish (mới thêm)
```

---

**Last Updated:** April 2026  
**Author:** Unilish Development Team
