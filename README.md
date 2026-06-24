# ParkSmart - Parking Building Management System

## Tài liệu
- [SRS - Báo cáo](https://1drv.ms/w/c/5ffe6974e09f3ca3/IQARB_j8dIlERKicw7XDQHj9AR2tZT2h37shuCf1qwtznK0?e=U7FHGn)
- [Doc AI Code](https://docs.google.com/document/d/1HMAsg3iuBezdkCwlWBz7DAs_BKnZ0ZiksKDJj9briPc/edit?usp=sharing)
- [Doc Tài Liệu BackEnd](https://docs.google.com/document/d/1WH845_wyM-CtCFZB1F7pU0RcGKqn3L9CPtMYm9ae-AM/edit?usp=sharing)

---

## Yêu cầu hệ thống

| Tool | Version |
|------|---------|
| Java JDK | 17+ |
| MySQL | 8.0 |
| Node.js | 18+ |
| npm | 9+ |

---

## Setup lần đầu (sau khi pull code)

### Bước 1: Tạo database MySQL

Mở MySQL Workbench hoặc terminal MySQL, chạy file schema:

```sql
source parking-backend/docs/parking_db_schema.sql
```

File này sẽ tự động:
- Tạo database `parking_db`
- Tạo tất cả bảng
- Seed dữ liệu mẫu (roles, users, building, slots, gates, pricing...)

**Tài khoản mặc định** (password: `Password123!`):

| Username | Role |
|----------|------|
| admin | ADMIN |
| manager | MANAGER |
| staff1 | STAFF |
| driver1 | DRIVER |
| driver2 | DRIVER |

> **Nếu DB đã tồn tại** và chỉ cần cập nhật cột mới, chạy thêm migration:
> ```sql
> USE parking_db;
> source parking-backend/docs/email-verification-migration.sql
> ```

### Bước 2: Chạy Backend

```bash
cd parking-backend
./mvnw spring-boot:run
```

Backend chạy tại `http://localhost:8080`

Swagger UI: `http://localhost:8080/swagger-ui.html`

**Cấu hình mặc định** (không cần thay đổi cho dev):
- MySQL: `root` / `12345` @ `localhost:3306/parking_db`
- JWT secret: có sẵn default

**Ghi đè bằng biến môi trường** (nếu khác máy bạn):

```bash
# MySQL khác password
set SPRING_DATASOURCE_PASSWORD=your_password

# Bật gửi email OTP thật (forgot password, verify email)
set MAIL_USERNAME=your-gmail@gmail.com
set MAIL_PASSWORD=your-app-password
```

> Nếu không set MAIL_USERNAME, OTP sẽ in ra console log — vẫn test được.

### Bước 3: Chạy Frontend

```bash
cd parking-frontend
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`

Frontend tự proxy `/api` → `http://localhost:8080` (cấu hình trong `vite.config.js`).

---

## Cấu trúc project

```
Parking-Building-Management-System/
├── parking-backend/          # Java Spring Boot (port 8080)
│   ├── docs/                 # SQL schema + migration
│   └── src/main/resources/
│       └── application.yaml  # Config (env var overrides)
├── parking-frontend/         # React + Vite (port 5173)
│   └── .env                  # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
└── ocr-service/              # Python OCR (optional)
```

## Biến môi trường (tùy chọn)

Backend (`application.yaml` đọc từ env var, có default cho dev):

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/parking_db...` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `root` | MySQL user |
| `SPRING_DATASOURCE_PASSWORD` | `12345` | MySQL password |
| `MAIL_USERNAME` | _(trống)_ | Gmail để gửi OTP |
| `MAIL_PASSWORD` | _(trống)_ | Gmail App Password |
| `JWT_SECRET` | `swp391-parking-dev-...` | JWT signing key |
| `GOOGLE_CLIENT_ID` | `1035279...` | Google OAuth |

Frontend (`.env`):

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `VITE_API_URL` | `/api/v1` | API base URL (proxy qua Vite) |
| `VITE_GOOGLE_CLIENT_ID` | `1035279...` | Google OAuth client |

---

## Lưu ý khi pull code mới

1. **Backend thay đổi entity** → kiểm tra xem có migration SQL mới trong `parking-backend/docs/` không, chạy nếu có
2. **Frontend thay đổi package** → chạy lại `npm install`
3. **JPA ddl-auto = none** → schema KHÔNG tự tạo, phải chạy SQL thủ công
