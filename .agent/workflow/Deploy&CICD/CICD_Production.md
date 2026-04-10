# CI/CD với Docker - Hướng dẫn Unilish (Production)

> **Tài liệu này hướng dẫn setup GitHub Actions CI/CD cho dự án Unilish với self-hosted runner, kết hợp Docker Compose và Cloudflare Tunnel.**

---

## 📋 Tổng quan

**CI/CD Pipeline tự động:**
- ✅ Tự động build Docker images khi push code lên nhánh `main`
- ✅ Deploy containers trên VPS bằng cấu hình `docker-compose.prod.yml`
- ✅ Tự động quản lý file `.env` qua GitHub Secrets
- ✅ Tự động load Tunnel (Cloudflare) cho hệ sinh thái Unilish

**Tech Stack:**
- GitHub Actions (self-hosted runner)
- Docker & Docker Compose
- Cloudflare Tunnel (`cloudflared`) cho việc public services

---

## 🔐 Setup GitHub Secrets (Bảo mật)

### Bước 1: Chuẩn bị Environment Files

Trong dự án Unilish, chúng ta có 3 file cần thiết lập environment trước khi chạy workflow:

```bash
# Lấy nội dung file Server môi trường Production
cd ~/unilish
cat server/.env
```

```bash
# Lấy nội dung file Client môi trường Production
cat client/.env.production
```

```bash
# Lấy nội dung file Admin môi trường Production
cat admin/.env.production
```

*(Lưu ý: copy toàn bộ nội dung của các file này)*

### Bước 2: Thêm Secrets vào GitHub

1. Mở repository: `https://github.com/nguyen-le-huy/unilish`
2. Vào tab **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** để thêm từng secret sau:
   - **Name:** `SERVER_ENV_FILE` — **Secret:** (Paste nội dung `server/.env`)
   - **Name:** `CLIENT_ENV_FILE` — **Secret:** (Paste nội dung `client/.env.production`)
   - **Name:** `ADMIN_ENV_FILE` — **Secret:** (Paste nội dung `admin/.env.production`)

---

## 🚀 Setup GitHub Actions Runner (One-time)

### Bước 1: Kiểm tra phần mềm (Prerequisites)

Hãy chắc chắn server đã sẵn sàng:
```bash
# Check Node.js
node -v

# Check Docker & Docker Compose
docker --version
docker compose version

# Check Cloudflared (nếu cấu hình tunnel theo DeployLinux_Production.md)
cloudflared --version
```

### Bước 2: Tạo Runner trên GitHub

1. Mở GitHub repository: `https://github.com/nguyen-le-huy/unilish`
2. Vào **Settings** → **Actions** → **Runners**
3. Click **"New self-hosted runner"**
4. Chọn:
   - OS: **Linux**
   - Architecture: **x64**
5. **Copy token cài đặt** hiển thị để sử dụng ở bước tiếp theo.

### Bước 3: Cài đặt Runner trên Server

```bash
# Tạo thư mục runner riêng biệt cho unilish (không chung vớivenir)
mkdir -p ~/github-runners/unilish
cd ~/github-runners/unilish

# Download runner (lấy lệnh trực tiếp từ trang hướng dẫn của GitHub để luôn đúng bản mới nhất)
curl -o actions-runner-linux-x64-xyz.tar.gz -L https://github.com/actions/runner/releases/download/...

# Giải nén
tar xzf ./actions-runner-xyz.tar.gz
```

### Bước 4: Cấu hình Runner

```bash
# Chạy config với token từ GitHub
./config.sh --url https://github.com/nguyen-le-huy/unilish --token YOUR_GITHUB_TOKEN

# Nhấn Enter để tự động điền các thiết lập mặc định (Name, Group, Labels...)
```

### Bước 5: Cài Runner như System Service

```bash
cd ~/github-runners/unilish

# Install & Start service
sudo ./svc.sh install
sudo ./svc.sh start

# Verify status (kiểm tra runner đã chạy chưa)
sudo ./svc.sh status
```

**Output mong đợi:** `Active: active (running)`

*(Lúc này kiểm tra trên GitHub giao diện runner sẽ chuyển thành "Idle" màu xanh chữ V)*

---

## 🔐 Cấp quyền Sudo cho Runner (Gợi ý thêm)

Trong quá trình CI/CD, có thể runner sẽ cần cập nhật file hệ thống hoặc khởi động lại Cloudflare tunnel. Bạn nên cấp quyền để runner tự động thực hiện việc này:

```bash
# Vd: Cấp quyền Restart Tunnel cho GitHub Runner nếu cần thiết (không cần Password)
echo "nguyenlehuy ALL=(ALL) NOPASSWD: /bin/systemctl restart cloudflared-unilish" | sudo tee -a /etc/sudoers.d/github-runner-unilish

# Verify
sudo cat /etc/sudoers.d/github-runner-unilish
```

---

## 📝 Workflow File

Sau đó trên source code của bạn, hãy tạo file `.github/workflows/deploy-production.yml`

**Một luồng công việc CI/CD phổ biến sẽ qua các Steps:**

1. **Checkout code:** Cập nhật source code mới nhất từ nhánh `main`.
2. **Setup file .env:** Đọc các biến Secrets trên Github (`SERVER_ENV_FILE`, `CLIENT_ENV_FILE`, `ADMIN_ENV_FILE`) và ghi ra file thực tế để container hoạt động đúng cấu hình của DB/Redis/...
3. **Build & Deploy:** 
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. **Cleanup:** Dọn dẹp cache cho VPS bằng câu lệnh `docker image prune -f`. Thao tác này tránh việc log file và old image chiếm dụng hết ổ cứng server.

---

## 🎯 Sử dụng Pipeline

### Khởi chạy quá trình tự động
Khi workflow đã được thiết lập, mọi thao tác commit code lên branch sẽ trigger lệnh deploy:

```bash
git add .
git commit -m "feat: cập nhật logic cho client Unilish"
git push origin main
```
Hệ thống sẽ chạy ngầm từ build đến publish project cho bạn.

### Chạy thủ công
1. Vào tab **Actions** trên GitHub.
2. Chọn workflow cần chạy.
3. Bấm **"Run workflow"** để deploy cưỡng bức (force deploy).

---

## 📊 Xem Logs & Debugging

### 1/ Lỗi nội bộ quy trình Workflow
Kiểm tra tab Actions của project trên GitHub để thấy Logs lỗi ở step nào (thường hay mắc lỗi biến môi trường hoặc script bash gõ sai).

### 2/ Lỗi Server (Container không chạy sau khi Deploy)
Website gặp lỗi 502/404 sau khi deploy, thường là do backend fail, kiểm tra logs bằng SSH vào server:

```bash
cd ~/unilish
# Xem tình trạng sống còn
docker compose -f docker-compose.prod.yml ps

# Xem log lỗi
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f client
```

### 2.1/ Lỗi Google OAuth `redirect_uri_mismatch`

Khi login Google báo lỗi 400 `redirect_uri_mismatch`, cần kiểm tra:

1. Google Cloud Console → OAuth 2.0 Client → **Authorized redirect URIs** có đúng:

```text
https://api-unilish.devenir.shop/api/auth/google/callback
```

2. Runtime production có `GOOGLE_CALLBACK_URL` trùng 100% URI trên.
3. Redeploy lại server sau khi sửa env/secrets:

```bash
docker compose -f docker-compose.prod.yml up -d --build --force-recreate server
```

### 3/ Xem tình trạng GitHub Runner
```bash
cd ~/github-runners/unilish
tail -f _diag/Runner_*.log
```

---

## 🌐 Các cổng kết nối thành công (Unilish Ecosystem)

Thông qua workflow trên, code Unilish mới nhất của bạn sẽ được update lên các URL:

| Service | Môi trường | Địa chỉ Public URL đã cấu hình (Subdomain qua Tunnel) |
|---|---|---|
| 🌐 **Client** | Production | `https://unilish.devenir.shop` |
| ⚙️ **Admin** | Production | `https://admin-unilish.devenir.shop` |
| 🔌 **API** | Production | `https://api-unilish.devenir.shop` |

---

## ✅ Checklist Deploy Production (Dành cho Developer)

- [ ] Phía VPS đã cấu hình riêng Cloudflare `TUNNEL_UUID` file thành chuẩn Tunnel thứ 2.
- [ ] Các port trong `docker-compose.prod.yml` chạy đúng config (5176, 5175, 5432) để tránh xung đột Devenir cũ.
- [ ] Tên file `.env` phải được check kĩ trên secrets tránh đánh sai dẫn đến Docker Compose không tìm thấy file và Build ngầm chết.
- [ ] Luôn test local trước bằng `npm run build` hoặc pull docker images từ branch test trước khi push lên `main`.
