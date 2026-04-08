# CI/CD với Docker - Hướng dẫn Devenir

> **Tài liệu này hướng dẫn setup GitHub Actions CI/CD cho dự án Docker-based với self-hosted runner**

---

## 📋 Tổng quan

**CI/CD Pipeline tự động:**
- ✅ Tự động build Docker images khi push code
- ✅ Deploy containers lên server Linux
- ✅ Reload Nginx configuration
- ✅ Thông báo kết quả deployment

**Tech Stack:**
- GitHub Actions (self-hosted runner)
- Docker & Docker Compose
- Nginx (reverse proxy)
- Tailscale Funnel (public access)

---

## � Setup GitHub Secrets (Bảo mật - Recommended)

### Bước 1: Chuẩn bị Environment Files

```bash
# Trên server, đọc nội dung file .env
cd ~/Development/devenir
cat server/.env
```

**Copy toàn bộ output** (Ctrl+Shift+C)

### Bước 2: Thêm Secrets vào GitHub

1. Mở repository: `https://github.com/nguyen-le-huy/devenir`
2. Vào **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Tạo secret:
   - **Name:** `SERVER_ENV_FILE`
   - **Secret:** (Paste toàn bộ nội dung file .env)
   - Click **Add secret**

### Bước 3: Thêm Secrets cho Client/Admin (Optional)

Nếu client hoặc admin cũng có file `.env`:

```bash
# Client .env (nếu có)
cat client/.env
```

Tạo secret:
- **Name:** `CLIENT_ENV_FILE`
- **Secret:** (Paste nội dung)

```bash
# Admin .env (nếu có)
cat admin/.env
```

Tạo secret:
- **Name:** `ADMIN_ENV_FILE`
- **Secret:** (Paste nội dung)

### Bước 4: Verify Secrets

1. Vào **Settings** → **Secrets and variables** → **Actions**
2. Phải thấy secrets đã tạo:
   - ✅ `SERVER_ENV_FILE`
   - ✅ `CLIENT_ENV_FILE` (optional)
   - ✅ `ADMIN_ENV_FILE` (optional)

**Lưu ý:** Sau khi tạo, bạn **KHÔNG THỂ** xem lại nội dung secret, chỉ có thể update hoặc xóa.

---

## �🚀 Setup GitHub Actions Runner (One-time)

### Bước 1: Verify Prerequisites

```bash
# Check Node.js version (cần >= 20.x)
node -v

# Check Docker
docker --version
docker compose version

# Check Nginx
nginx -v
```

### Bước 2: Tạo Runner trên GitHub

1. Mở GitHub repository: `https://github.com/nguyen-le-huy/devenir`
2. Vào **Settings** → **Actions** → **Runners**
3. Click **"New self-hosted runner"**
4. Chọn:
   - OS: **Linux**
   - Architecture: **x64**
5. **Copy token** hiển thị (dùng ở bước sau)

### Bước 3: Cài đặt Runner trên Server

```bash
# Tạo thư mục runner
mkdir -p ~/github-runners/devenir
cd ~/github-runners/devenir

# Download runner (version có thể khác, copy lệnh từ GitHub)
curl -o actions-runner-linux-x64-2.331.0.tar.gz -L \
https://github.com/actions/runner/releases/download/v2.331.0/actions-runner-linux-x64-2.331.0.tar.gz

# Giải nén
tar xzf ./actions-runner-linux-x64-2.331.0.tar.gz
```

### Bước 4: Cấu hình Runner

```bash
# Chạy config với token từ GitHub
./config.sh --url https://github.com/nguyen-le-huy/devenir --token YOUR_GITHUB_TOKEN

# Khi hỏi, nhấn Enter để dùng defaults:
# Runner name: [Enter - dùng hostname]
# Runner group: [Enter - dùng Default]
# Labels: [Enter - dùng default labels]
# Work folder: [Enter - dùng _work]
```

### Bước 5: Cài Runner như System Service

```bash
cd ~/github-runners/devenir

# Install service
sudo ./svc.sh install

# Start service
sudo ./svc.sh start

# Verify status
sudo ./svc.sh status
```

**Output mong đợi:** `Active: active (running)`

### Bước 6: Verify Runner Online

- Quay lại GitHub → Settings → Actions → Runners
- Thấy runner status **"Idle"** màu xanh ✅

---

## 🔐 Cấp quyền Sudo cho Runner

Runner cần quyền để reload Nginx:

```bash
# Tạo sudoers file cho runner
echo "nguyenlehuy ALL=(ALL) NOPASSWD: /usr/sbin/nginx" | sudo tee -a /etc/sudoers.d/github-runner

# Verify
sudo cat /etc/sudoers.d/github-runner
```

**Output mong đợi:**
```
nguyenlehuy ALL=(ALL) NOPASSWD: /usr/sbin/nginx
```

---

## 📝 Workflow File

File workflow đã được tạo tại: [.github/workflows/deploy.yml](/.github/workflows/deploy.yml)

**Workflow này sẽ:**

1. **Checkout code** - Pull code mới từ GitHub
2. **Verify .env files** - Kiểm tra file môi trường tồn tại
3. **Build Docker images** - Build tất cả services
4. **Deploy containers** - Restart containers với images mới
5. **Health check** - Test services đã sẵn sàng
6. **Reload Nginx** - Apply config changes (nếu có)
7. **Cleanup** - Xóa old Docker images

---

## 🎯 Sử dụng CI/CD

### Auto Deploy (Trigger tự động)

Mỗi khi push code lên branch `main`:

```bash
# Trên local/Mac
git add .
git commit -m "feat: Add new feature"
git push origin main
```

→ **GitHub Actions tự động:**
1. Pull code về server
2. Build Docker images
3. Restart containers
4. Test health
5. Thông báo kết quả

### Manual Deploy (Trigger thủ công)

Nếu muốn deploy mà không push code:

1. Vào GitHub repository
2. Tab **Actions**
3. Chọn workflow **"Docker Deploy to Production"**
4. Click **"Run workflow"** → **"Run workflow"**

---

## 📊 Xem Logs & Monitoring

### Xem Workflow Logs trên GitHub

1. Vào GitHub repository
2. Tab **Actions**
3. Click vào workflow run mới nhất
4. Xem logs từng step

### Xem Runner Logs trên Server

```bash
# Xem real-time logs
cd ~/github-runners/devenir
tail -f _diag/Runner_*.log

# Hoặc xem systemd logs
sudo journalctl -u actions.runner.*.service -f
```

### Xem Docker Logs

```bash
cd ~/Development/devenir

# Logs tất cả services
docker compose logs -f

# Logs service cụ thể
docker compose logs -f server
docker compose logs -f client
docker compose logs -f admin
```

---

## 🛠️ Quản lý Runner

### Check Status

```bash
cd ~/github-runners/devenir
sudo ./svc.sh status
```

### Restart Runner

```bash
cd ~/github-runners/devenir
sudo ./svc.sh stop
sudo ./svc.sh start
```

### Stop Runner

```bash
cd ~/github-runners/devenir
sudo ./svc.sh stop
```

### Uninstall Runner

```bash
cd ~/github-runners/devenir

# Stop service
sudo ./svc.sh stop

# Uninstall service
sudo ./svc.sh uninstall

# Remove config (cần removal token từ GitHub)
./config.sh remove --token YOUR_REMOVAL_TOKEN
```

---

## 🔧 Troubleshooting

### Problem: Workflow không trigger

**Kiểm tra:**
```bash
# Verify runner đang chạy
cd ~/github-runners/devenir
sudo ./svc.sh status

# Xem có error không
tail -100 _diag/Runner_*.log
```

**Giải pháp:**
```bash
# Restart runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

### Problem: Build failed - "no such file or directory" hoặc ".env not found"

**Nguyên nhân:** GitHub Secret chưa được setup hoặc sai tên

**Giải pháp:**
```bash
# 1. Verify secret đã tạo trên GitHub
# Settings → Secrets → Actions → Phải có SERVER_ENV_FILE

# 2. Nếu chưa có, tạo secret (xem phần Setup GitHub Secrets)

# 3. Test workflow lại
# Vào Actions → Re-run failed jobs
```

**Fallback (nếu không dùng Secrets):**
```bash
cd ~/Development/devenir

# Tạo .env trực tiếp trên server
cp server/.env.example server/.env
nano server/.env  # Edit với credentials thật

# Sửa workflow để không dùng secrets
# (Comment dòng tạo .env từ secrets)
```

### Problem: Permission denied khi reload Nginx

**Nguyên nhân:** User chưa có quyền sudo cho nginx

**Giải pháp:**
```bash
# Thêm lại vào sudoers
echo "nguyenlehuy ALL=(ALL) NOPASSWD: /usr/sbin/nginx" | sudo tee -a /etc/sudoers.d/github-runner
```

### Problem: Docker build failed - out of space

**Giải pháp:**
```bash
# Xóa old images và containers
docker system prune -a -f

# Xóa build cache
docker builder prune -a -f

# Check disk space
df -h
```

### Problem: Container không start sau deploy

**Kiểm tra:**
```bash
cd ~/Development/devenir

# Xem container status
docker compose ps

# Xem logs của container fail
docker compose logs [service-name]

# VD: docker compose logs server
```

**Giải pháp phổ biến:**
- Port bị conflict → Stop process đang dùng port
- .env file sai → Verify credentials
- Dependency issue → Rebuild với `--no-cache`

---

## 📈 Workflow Nâng cao (Tùy chọn)

### Thêm Tests vào Pipeline

Sửa [.github/workflows/deploy.yml](/.github/workflows/deploy.yml):

```yaml
- name: Run Tests
  run: |
    # Backend tests
    docker compose run --rm server npm test
    
    # Frontend tests
    docker compose run --rm client npm test
```

### Thêm Slack/Discord Notification

1. Tạo Webhook URL từ Slack/Discord
2. Thêm vào GitHub Secrets: `SLACK_WEBHOOK`
3. Thêm step:

```yaml
- name: Notify Slack
  if: always()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"Deploy ${{ job.status }}: https://hystudio-server.tail86e288.ts.net"}'
```

### Deploy theo Environment (Staging/Production)

```yaml
on:
  push:
    branches: 
      - main          # Production
      - develop       # Staging

jobs:
  deploy:
    runs-on: self-hosted
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

---

### Lưu ý về Network cho N8N và Server

**LƯU Ý QUAN TRỌNG:**
N8N cần join vào network của hệ thống chính (devenir-network) để Server có thể gọi Webhook nội bộ.
Dưới đây là ví dụ cấu hình trong `docker-compose.yml` cho N8N để join vào network `devenir-network` (được tạo bởi `docker compose` của dự án chính):

```yaml
# Ví dụ cấu hình N8N trong docker-compose.yml
services:
  n8n:
    image: n8nio/n8n
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - default
      - devenir-network # N8N join vào network chính của dự án
    environment:
      - N8N_HOST=n8n.devenir.shop
      # ... các biến môi trường khác của N8N

networks:
  devenir-network:
    external: true # Khai báo đây là một network đã tồn tại bên ngoài
    name: devenir_devenir-network # Tên network được tạo bởi docker compose của dự án chính (thường là <project_name>_default hoặc <project_name>_<network_name>)

volumes:
  n8n_data:
```

---

## ✅ Checklist Deployment

**Lần đầu setup:**
- [ ] Cài Node.js 20+
- [ ] Cài Docker & Docker Compose
- [ ] Setup GitHub runner
- [ ] Cấu hình sudoers
- [ ] Tạo .env files
- [ ] Test workflow lần đầu

**Mỗi lần deploy:**
- [ ] Code đã được test local
- [ ] Commit message rõ ràng
- [ ] Push lên branch `main`
- [ ] Xem workflow logs trên GitHub
- [ ] Verify services trên server
- [ ] Test public URLs

---

## 🌐 Public URLs

Sau khi deploy thành công, services sẽ accessible tại:

- **Client:** https://devenir.shop/
- **Admin:** https://admin.devenir.shop/
- **API:** https://api.devenir.shop/api
- **N8N:** https://n8n.devenir.shop/

---

## 📚 Tham khảo

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Self-hosted Runner Guide](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [DeployLinux.md](./DeployLinux.md) - Server deployment guide

---

**Last Updated:** February 2, 2026  
**Author:** HyStudio Development Team