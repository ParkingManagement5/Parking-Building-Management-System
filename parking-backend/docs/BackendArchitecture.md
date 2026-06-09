# Backend Architecture
> Version 2.0 — Cập nhật: bỏ Ticket module, thêm QR token, deposit logic

---

## 1. Project Overview

**Project Name:** Parking Building Management System

The backend system is responsible for managing:

* User authentication and authorization
* Parking building management
* Vehicle and booking management (với QR check-in, deposit cho CAR/ELECTRIC_CAR)
* Parking sessions (BOOKING / WALK_IN_AUTO / WALK_IN_MANUAL)
* Payment management (DEPOSIT + PARKING_FEE)
* OCR vehicle plate recognition
* Request and exception handling
* Staff scheduling
* Reporting and auditing

---

## 2. Technology Stack

### Core Technologies

| Component | Technology |
|-----------|------------|
| Language | Java 17 |
| Framework | Spring Boot 3.3.x |
| Build Tool | Maven |
| Database | MySQL 8 |
| API Style | RESTful API |

### Libraries

* Spring Web
* Spring Data JPA
* Spring Security
* JWT Authentication (jjwt 0.12.3) — dùng cho cả auth token và QR token
* Bean Validation
* Lombok
* MapStruct
* Swagger OpenAPI (springdoc 2.3.0)

---

## 3. Architecture Pattern

```text
Client
   ↓
Controller Layer   ← validate request, trả ApiResponse<T>
   ↓
Service Layer      ← business logic, transaction, throw AppException
   ↓
Repository Layer   ← JPA queries
   ↓
MySQL Database
```

---

## 4. Package Structure

```text
com.swp391.parking

├── config          ← SecurityConfig, JpaConfig, OpenApiConfig
├── security
│   ├── jwt         ← JwtUtil, JwtAuthFilter
│   └── service     ← UserDetailsServiceImpl
├── controller      ← REST endpoints
├── service
│   └── impl        ← Business logic
├── repository      ← JPA repositories
├── entity          ← JPA entities (extends BaseEntity)
├── dto
│   ├── request     ← *Request.java
│   └── response    ← *Response.java, ApiResponse.java
├── mapper          ← MapStruct mappers
├── exception       ← AppException, GlobalExceptionHandler
├── util            ← FeeCalculator, QrTokenUtil, DepositCalculator
└── scheduler       ← BookingExpiryScheduler
```

---

## 5. Environment Configuration

```text
src/main/resources
├── application.yml       ← commit lên git (không có password)
├── application-dev.yml   ← KHÔNG commit (gitignore)
└── application-prod.yml  ← KHÔNG commit (gitignore)
```

---

## 6. Security Design

### Authentication
* JWT Token Authentication
* QR Token: cũng dùng JWT (khác secret key hoặc claim `type=QR`)

### Authorization — RBAC

| Role | Quyền chính |
|------|-------------|
| DRIVER | Tạo booking, xem lịch sử, thanh toán |
| STAFF | Check-in/out, verify OCR, xử lý request |
| MANAGER | Quản lý pricing, báo cáo, quản lý staff |
| ADMIN | Toàn quyền hệ thống |

### Password Security
* BCrypt Password Encoder

---

## 7. Business Modules

### Authentication Module
Entities: User, Role, UserRole, PasswordResetToken
Features: Login, Register, JWT, Password Reset

---

### Parking Infrastructure Module
Entities: ParkingBuilding, Floor, Zone, ParkingSlot, Gate
Features: CRUD building/floor/zone/slot/gate, quản lý status

---

### Vehicle & Booking Module
Entities: Vehicle, VehicleType, Booking

Features:
* Vehicle CRUD
* Booking với deposit (CAR + ELECTRIC_CAR)
* Sinh QR token sau khi payment PAID
* Gửi QR qua email (notification)
* Scheduler tự EXPIRED booking sau `expired_at`

**Deposit logic** (DepositCalculator.java):
```
< 30 phút  → 0đ       (MOTORBIKE luôn 0đ)
30p – 2h   → 10,000đ
2h – 4h    → 15,000đ
4h – 6h    → 20,000đ
> 6h       → 30,000đ
```
Áp dụng cho: CAR, ELECTRIC_CAR

**expired_at logic:**
```
expired_at = MIN(now + 15 phút, booking_start_time - 5 phút)
Không cho booking nếu booking_start_time - now < 10 phút
```

---

### Parking Session Module
Entities: ParkingSession, GateLog, OcrScan

> ⚠️ Không có Ticket entity — đã bỏ hoàn toàn

Features:
* Check-in: verify QR (booking) hoặc OCR biển số (walk-in)
* Check-out: OCR biển số hoặc QR, tính phí
* Ghi GateLog mọi sự kiện ENTRY/EXIT
* OCR: AUTO_APPROVED / MANUAL_REVIEW / STAFF_APPROVED

**entry_mode:**
* `BOOKING` — có QR hợp lệ
* `WALK_IN_AUTO` — OCR tự động nhận diện
* `WALK_IN_MANUAL` — staff nhập tay

---

### Payment Module
Entities: PricingPolicy, Payment

**payment_type:**
* `DEPOSIT` — thu cọc khi tạo booking (trước khi có session)
* `PARKING_FEE` — phí đỗ xe khi checkout

**Fee calculation:**
```
total = base_fee + overtime_fee + penalty_fee - discount - deposit_deducted
```

---

### Request & Exception Module
Entities: Request, ExceptionCase

**request_type:**
* `LOST_QR` — driver mất QR/điện thoại
* `WRONG_FEE` — khiếu nại phí
* `CANNOT_FIND_CAR`
* `OTHER`

---

### Staff Management Module
Entities: Shift, StaffShift
Features: Staff scheduling, shift assignment

---

### Audit & Configuration Module
Entities: ActivityLog, Notification, SystemConfig
Features: Audit logging, notifications (email QR, reminder), system config

---

## 8. Git Branch Strategy

```text
main
└── backend
    ├── feature/parking-infra   ← BE-1
    ├── feature/booking         ← BE-2
    ├── feature/session         ← BE-3
    └── feature/payment         ← BE-4
```

**Rules:**
1. Tạo branch từ `backend`
2. Pull Request trước khi merge
3. Ít nhất 1 người review
4. Không commit `application-dev.yml`
5. Mỗi branch chỉ làm 1 module

---

## 9. Coding Standards

* Response format: `ApiResponse<T>` cho mọi endpoint
* Exception: throw `AppException(HttpStatus, message)` từ service
* Entity: extends `BaseEntity` (auto createdAt/updatedAt)
* Naming: PascalCase class, snake_case DB, `/api/v1/resource` endpoint
* Swagger: `@Operation` annotation trên mọi endpoint
* Commit message: `feat(module): mô tả` / `fix(module): mô tả`
