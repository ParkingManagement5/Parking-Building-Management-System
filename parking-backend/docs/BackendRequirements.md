# SWP391 Parking System - Backend Specification
> Version 2.0 — Cập nhật: bỏ ticket, thêm QR, deposit cho CAR/ELECTRIC_CAR

---

## I. User Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Authentication & Account Management |
| FR-2 | User Role Management |
| FR-3 | Vehicle Management |
| FR-4 | Parking Infrastructure Management |
| FR-5 | Vehicle Type Management |
| FR-6 | Booking Management |
| FR-7 | Parking Session Management |
| ~~FR-8~~ | ~~Ticket Management~~ — **ĐÃ BỎ**, thay bằng QR trong FR-6 |
| FR-8 | Gate Log Management |
| FR-9 | OCR License Plate Recognition |
| FR-10 | Pricing Policy Management |
| FR-11 | Payment Processing |
| FR-12 | Request Management |
| FR-13 | Exception Case Management |
| FR-14 | Notification Management |
| FR-15 | Staff Shift Management |
| FR-16 | Activity Logging |
| FR-17 | System Configuration |
| FR-18 | Report Management |

---

## II. Non-Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-1 | Performance | Response within 2-3 seconds |
| NFR-2 | Security | BCrypt password + JWT signed QR |
| NFR-3 | Authorization | RBAC: DRIVER, STAFF, MANAGER, ADMIN |
| NFR-4 | Reliability | No data loss |
| NFR-5 | Data Integrity | PK/FK integrity |
| NFR-6 | Availability | Available during operating hours |
| NFR-7 | Usability | Easy to use |
| NFR-8 | Compatibility | Chrome, Edge, Firefox |
| NFR-9 | Maintainability | Layered Architecture |
| NFR-10 | Scalability | Expandable infrastructure |
| NFR-11 | OCR Accuracy | OCR reviewable by staff |
| NFR-12 | Auditability | Activity logging |
| NFR-13 | Notification Reliability | Reliable notifications |
| NFR-14 | Backup & Recovery | Periodic backup |
| NFR-15 | Configurability | Configurable settings |

---

## III. Functional Requirement Specifications

### FRS-01 Authentication & Account Management
- Account registration, login, logout
- Password reset and profile management

---

### FRS-02 Booking Management

**Tables:** booking, vehicle, parking_slot, users, notification, payment

**Main Flow:**
1. Driver chọn slot, xe, giờ đến
2. Hệ thống kiểm tra slot trống và loại xe phù hợp
3. Tính phí cọc theo khoảng cách giờ đến
4. Driver thanh toán (cọc hoặc toàn bộ)
5. Hệ thống sinh QR token (JWT-signed) gửi qua email
6. Driver đến, quét QR check-in
7. Nếu không đến: Scheduler tự EXPIRED, giữ lại cọc

**Business Rules:**

| Rule | Nội dung |
|------|----------|
| BR-01 | Một slot chỉ được đặt bởi một xe tại một thời điểm |
| BR-02 | Loại xe phải phù hợp với loại zone (MOTORBIKE/CAR/ELECTRIC_CAR) |
| BR-03a | Không cho phép booking nếu `booking_start_time - now < 10 phút` → dùng walk-in |
| BR-03b | `expired_at = MIN(now + 15 phút, booking_start_time - 5 phút)` |
| BR-03c | Booking CONFIRMED hết hạn **30 phút** sau `booking_start_time` → slot giải phóng, mất cọc |
| BR-03d | Phí cọc chỉ áp dụng cho **CAR và ELECTRIC_CAR** |
| BR-03e | Bảng phí cọc theo khoảng cách `now → booking_start_time`: < 30 phút: 0đ / 30p–2h: 10,000đ / 2–4h: 15,000đ / 4–6h: 20,000đ / > 6h: 30,000đ |
| BR-03f | Khi checkout, `deposit_amount` được trừ vào `total_amount` |
| BR-04 | QR token = JWT signed `{booking_id, license_plate, slot_id, expired_at}` |
| BR-05 | QR chỉ dùng được 1 lần (`qr_used_at != NULL` → từ chối) |
| BR-06 | Driver chỉ được có 1 booking ACTIVE tại 1 thời điểm cho 1 xe |

---

### FRS-03 Parking Session Management

**Tables:** parking_session, parking_slot, gate, gate_log

**Main Flow:**
1. Xe đến cổng → OCR quét biển số
2. Nếu có booking: verify QR (JWT decode + kiểm tra qr_used_at)
3. Nếu walk-in: tự động tìm slot trống theo loại xe
4. Tạo ParkingSession, đánh dấu slot OCCUPIED
5. Xe ra cổng → OCR exit
6. Tính phí → thanh toán → mở barrier

**Business Rules:**

| Rule | Nội dung |
|------|----------|
| BR-07 | Check-in chỉ trong giờ hoạt động của tòa nhà |
| BR-08 | Một session thuộc đúng một slot |
| BR-09 | Thanh toán phải hoàn tất trước khi mở barrier exit |
| BR-10 | OCR thất bại → staff nhập tay biển số (WALK_IN_MANUAL) |

---

### FRS-04 OCR License Plate Recognition

**Tables:** ocr_scan, parking_session, gate_log

**Main Flow:**
1. Chụp ảnh → gửi OCR service
2. Nhận plate + confidence score
3. Nếu confidence cao → AUTO_APPROVED
4. Nếu thấp → MANUAL_REVIEW → staff xác nhận

**Business Rules:**

| Rule | Nội dung |
|------|----------|
| BR-11 | OCR kết quả phải được verify (auto hoặc staff) trước khi tạo session |

---

### FRS-05 Fee Calculation & Payment Processing

**Tables:** payment, pricing_policy, parking_session, booking, vehicle_type

**Main Flow:**
1. Khi tạo booking → tạo payment `type=DEPOSIT`, thu phí cọc
2. Khi checkout → tạo payment `type=PARKING_FEE`
3. Tính `total = base_fee + overtime_fee + penalty_fee - discount - deposit_deducted`
4. Driver thanh toán CASH/VNPAY → mở barrier

**Business Rules:**

| Rule | Nội dung |
|------|----------|
| BR-12 | Phí đỗ xe tính theo PricingPolicy × duration × vehicle_type × day_type |
| BR-13 | deposit_amount được trừ vào total_amount khi checkout |
| BR-14 | Revenue report chỉ tính payment có status=PAID |

---

### FRS-06 Request & Exception Case Management

**Tables:** request, exception_case, parking_session, payment, notification

**request_type values:**
- `LOST_QR` — driver mất điện thoại/email không lấy được QR
- `WRONG_FEE` — khiếu nại phí sai
- `CANNOT_FIND_CAR` — không tìm được xe trong bãi
- `OTHER`

---

### FRS-07 Notification Management
- Gửi email QR sau khi booking CONFIRMED
- Nhắc nhở trước `booking_start_time` 30 phút
- Thông báo khi booking sắp EXPIRED

---

### FRS-08 Report Management
- Revenue reports (chỉ PAID payments)
- Occupancy reports
- Operational reports

---

## IV. Business Rules Summary

| Rule | Module | Nội dung |
|------|--------|----------|
| BR-01 | Booking | 1 slot = 1 xe tại 1 thời điểm |
| BR-02 | Booking | Loại xe phải match zone |
| BR-03a | Booking | Tối thiểu 10 phút trước mới được booking |
| BR-03b | Booking | expired_at = MIN(now+15p, start-5p) |
| BR-03c | Booking | CONFIRMED hết hạn 30p sau booking_start_time |
| BR-03d | Booking | Cọc chỉ cho CAR và ELECTRIC_CAR |
| BR-03e | Booking | Bậc thang cọc: <30p=0 / 30p-2h=10k / 2-4h=15k / 4-6h=20k / >6h=30k |
| BR-03f | Booking | Cọc trừ vào tổng phí khi checkout |
| BR-04 | Booking | QR = JWT signed token |
| BR-05 | Booking | QR chỉ dùng 1 lần |
| BR-06 | Booking | 1 xe chỉ có 1 booking ACTIVE |
| BR-07 | Session | Check-in trong giờ hoạt động |
| BR-08 | Session | Session thuộc đúng 1 slot |
| BR-09 | Session | Phải thanh toán trước khi mở barrier |
| BR-10 | Session | OCR fail → staff nhập tay |
| BR-11 | OCR | Phải verify trước khi tạo session |
| BR-12 | Payment | Phí = PricingPolicy × duration × type × day_type |
| BR-13 | Payment | Deposit trừ vào total_amount |
| BR-14 | Report | Chỉ tính PAID payments |
| BR-15 | Auth | Lock account sau 6 lần đăng nhập sai |
| BR-16 | Auth | Password lưu bằng BCrypt |
