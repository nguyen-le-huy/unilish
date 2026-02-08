---
description: Guide to migrating Neo4j data data from Local Docker (Mac) to Production Docker (Linux)
---

# Quy trình Migration Neo4j (Docker to Docker)

Tài liệu này hướng dẫn cách chuyển dữ liệu Neo4j từ máy local (MacBook) lên Server (Linux) sử dụng Docker.

**Nguyên tắc:** Chúng ta sẽ không copy thô thư mục data (vì khác hệ điều hành), mà sử dụng công cụ `neo4j-admin dump` để đóng gói dữ liệu an toàn.

---

## 1. Tại máy MacBook (Local - Backup)

Bước này sẽ tạo ra một file `.dump` chứa toàn bộ dữ liệu graph của bạn.

1.  **Stop container Neo4j đang chạy:**
    ```bash
    docker stop unilish-neo4j
    ```

2.  **Chạy lệnh Dump:**
    Lệnh này sẽ tạo file `neo4j.dump` ngay tại thư mục hiện tại của bạn.
    *Lưu ý: Thay `unilish_neo4j_data` bằng tên volume thực tế nếu khác (kiểm tra bằng `docker volume ls`).*

    ```bash
    docker run --interactive --tty --rm \
       --volume unilish_neo4j_data:/data \
       --volume $(pwd):/backups \
       neo4j:5-community \
       neo4j-admin database dump neo4j --to-path=/backups
    ```

3.  **Kết quả:** Bạn sẽ thấy file `neo4j.dump` xuất hiện trong thư mục hiện tại.

4.  **Start lại Neo4j (nếu cần dùng tiếp):**
    ```bash
    docker start unilish-neo4j
    ```

---

## 2. Upload file lên Linux Server

Sử dụng `scp` để bắn file vừa tạo lên server.

```bash
# Cấu trúc: scp [file_local] [user]@[ip_server]:[thư_mục_lưu]
scp neo4j.dump root@123.45.67.89:/root/unilish/
```

---

## 3. Tại Linux Server (Deploy - Restore)

Đảm bảo bạn đã pull code và có file `docker-compose.prod.yml` trên server.

1.  **Tắt Neo4j trên Server (nếu đang chạy):**
    ```bash
    docker-compose -f docker-compose.prod.yml stop neo4j
    ```

2.  **Chạy lệnh Load (Restore):**
    *Lưu ý: Tên volume trên prod có thể khác (ví dụ: `unilish_neo4j_data` hoặc `unilish_redis_data`... hãy kiểm tra kỹ).*

    ```bash
    # Xác định tên volume
    docker volume ls | grep neo4j
    
    # Giả sử tên volume là: unilish_neo4j_data
    docker run --interactive --tty --rm \
       --volume unilish_neo4j_data:/data \
       --volume $(pwd):/backups \
       neo4j:5-community \
       neo4j-admin database load neo4j --from-path=/backups --overwrite-destination=true
    ```

3.  **Khởi động lại Server:**
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```

---

## 4. Xử lý sự cố thường gặp

### Lỗi: "Database is in use"
*   **Nguyên nhân:** Container Neo4j chính vẫn đang chạy và giữ file lock.
*   **Khắc phục:** Bắt buộc phải `docker stop` container Neo4j chính trước khi chạy lệnh dump/load.

### Lỗi: "Permission denied" (trên Linux)
*   **Nguyên nhân:** File dump upload lên có quyền root, nhưng docker container chạy user neo4j.
*   **Khắc phục:** Chạy lệnh `chmod 777 neo4j.dump` trước khi restore.

### Lỗi khác phiên bản
*   **Lưu ý:** Đảm bảo `image` Neo4j ở máy local và server giống nhau (ví dụ cùng là `neo4j:5-community`). Nếu lệch version lớn (4.x vs 5.x) sẽ không restore được.
