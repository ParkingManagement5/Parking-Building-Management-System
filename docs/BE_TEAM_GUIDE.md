# 🚗 Parking System — Hướng Dẫn BE Team (W4)

> Dành cho: BE2, BE3, BE4 (và BE1 leader review lại)
> Tuần hiện tại: W4/10 — Sprint 1 đang chạy (Auth xong rồi, chuẩn bị Sprint 2)

---

## 1. Tổng Quan Dự Án

Hệ thống quản lý bãi đỗ xe gồm: đặt chỗ, check-in/out bằng OCR, thanh toán, báo cáo.

**Stack:**
- Java 17 + Spring Boot 3.3.5
- MySQL 8, Spring Data JPA (Hibernate)
- Spring Security + JWT
- Lombok, MapStruct, Swagger (springdoc)
- Maven

---

## 2. Phân Chia Module

| Người | Module | Nhánh feature |
|------|--------|---------------|
| BE1 | Auth & User Management | `feature/auth` ✅ đã có |
| BE2 | Parking Infrastructure & Vehicle | `feature/parking-infra` |
| BE3 | Booking & Parking Session | `feature/booking-session` |
| BE4 | Payment & Support Services | `feature/payment-report` |

---

## 3. Setup Môi Trường (Từng Người Làm)

### Bước 1 — Cài tools

- **JDK 17**: https://adoptium.net (Eclipse Temurin 17)
- **IntelliJ IDEA Community** (free) hoặc Ultimate
- **MySQL 8**: https://dev.mysql.com/downloads/mysql/ — nhớ đặt root password là `root123` hoặc tùy chỉnh
- **Git**: đã có rồi
- **Postman** hoặc dùng Swagger UI tại `http://localhost:8080/swagger-ui.html`

### Bước 2 — Clone repo và checkout nhánh

```bash
# Clone về máy (thay URL bằng link GitHub thực)
git clone https://github.com/your-org/Parking-Building-Management-System.git
cd Parking-Building-Management-System

# Xem các nhánh hiện có
git branch -a

# Checkout nhánh backend (nhánh chính của BE team)
git checkout backend

# Tạo nhánh feature của mình (ví dụ BE2)
git checkout -b feature/parking-infra
```

### Bước 3 — Tạo file config local (QUAN TRỌNG — không commit file này)

Trong thư mục `parking-backend/src/main/resources/`, tạo file `application-dev.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/parking_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh
    username: root
    password: root123      # đổi thành password MySQL của máy mình
    driver-class-name: com.mysql.cj.jdbc.Driver
```

> ⚠️ File này đã có trong `.gitignore` — KHÔNG được commit lên. Mỗi người tự tạo trên máy mình.

### Bước 4 — Tạo Database

Mở MySQL Workbench hoặc terminal, chạy file SQL đính kèm:

```bash
mysql -u root -p < parking_db_schema.sql
```

Hoặc copy-paste toàn bộ nội dung `parking_db_schema.sql` vào MySQL Workbench rồi Execute.

Kết quả: tất cả 20 bảng được tạo + seed data cho `vehicle_type` và `role`.

### Bước 5 — Chạy project

Mở IntelliJ → Open folder `Parking-Building-Management-System/parking-backend` → đợi Maven download dependencies → Run `ParkingBackendApplication.java`.

Kiểm tra: mở `http://localhost:8080/swagger-ui.html` — thấy API docs là OK.

---

## 4. Hiểu Cấu Trúc Package

```
com.swp391.parking
├── config/          ← SecurityConfig, JpaConfig (đã có)
├── security/
│   ├── jwt/         ← JwtUtil, JwtAuthFilter (đã có)
│   └── service/     ← UserDetailsServiceImpl (đã có)
├── controller/      ← Nhận HTTP request, gọi service
├── service/
│   └── impl/        ← Business logic ở đây
├── repository/      ← Interface extends JpaRepository
├── entity/          ← Map với bảng DB
├── dto/
│   ├── request/     ← Dữ liệu user gửi lên
│   └── response/    ← Dữ liệu trả về cho client
├── mapper/          ← MapStruct: convert entity ↔ DTO
├── exception/       ← AppException, GlobalExceptionHandler (đã có)
├── util/
└── scheduler/       ← Xử lý booking hết hạn, etc.
```

**Luồng request chuẩn:**
```
HTTP Request
    → Controller (validate input, gọi service)
    → Service/impl (business logic)
    → Repository (query DB)
    → Entity (map DB row)
    → DTO (trả về response)
```

---

## 5. Pattern Chuẩn — Làm Theo Cái Này

Dưới đây là pattern cụ thể, copy và điều chỉnh tên class/field theo module của mình.

### Entity
```java
@Entity
@Table(name = "parking_building")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParkingBuilding extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "building_id")
    private Integer buildingId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "status", length = 20)
    @Enumerated(EnumType.STRING)
    private BuildingStatus status;

    // Nếu có quan hệ 1:N
    @OneToMany(mappedBy = "parkingBuilding", cascade = CascadeType.ALL)
    private List<Floor> floors = new ArrayList<>();

    public enum BuildingStatus { ACTIVE, INACTIVE, MAINTENANCE }
}
```

> Lưu ý: luôn `extends BaseEntity` để có `created_at` và `updated_at` tự động.

### Repository
```java
public interface ParkingBuildingRepository extends JpaRepository<ParkingBuilding, Integer> {
    // Spring tự generate query từ tên method
    Optional<ParkingBuilding> findByName(String name);
    List<ParkingBuilding> findByStatus(ParkingBuilding.BuildingStatus status);
}
```

### DTO
```java
// Request DTO
@Data
public class CreateBuildingRequest {
    @NotBlank(message = "Name is required")
    private String name;
    @NotBlank
    private String address;
    private String operatingHours;
}

// Response DTO
@Data @Builder
public class BuildingResponse {
    private Integer buildingId;
    private String name;
    private String address;
    private String status;
    private LocalDateTime createdAt;
}
```

### Service Interface + Impl
```java
// Interface
public interface ParkingBuildingService {
    BuildingResponse createBuilding(CreateBuildingRequest request);
    BuildingResponse getBuilding(Integer id);
    List<BuildingResponse> getAllBuildings();
    BuildingResponse updateBuilding(Integer id, CreateBuildingRequest request);
    void deleteBuilding(Integer id);
}

// Implementation
@Service
@RequiredArgsConstructor
public class ParkingBuildingServiceImpl implements ParkingBuildingService {

    private final ParkingBuildingRepository buildingRepository;

    @Override
    public BuildingResponse createBuilding(CreateBuildingRequest request) {
        ParkingBuilding building = ParkingBuilding.builder()
                .name(request.getName())
                .address(request.getAddress())
                .status(ParkingBuilding.BuildingStatus.ACTIVE)
                .build();
        building = buildingRepository.save(building);
        return toResponse(building);
    }

    @Override
    public BuildingResponse getBuilding(Integer id) {
        ParkingBuilding building = buildingRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        return toResponse(building);
    }

    private BuildingResponse toResponse(ParkingBuilding b) {
        return BuildingResponse.builder()
                .buildingId(b.getBuildingId())
                .name(b.getName())
                .address(b.getAddress())
                .status(b.getStatus().name())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
```

### Controller
```java
@RestController
@RequestMapping("/api/buildings")
@RequiredArgsConstructor
@Tag(name = "Parking Building", description = "Manage parking buildings")
public class ParkingBuildingController {

    private final ParkingBuildingService buildingService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<BuildingResponse>> create(
            @Valid @RequestBody CreateBuildingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(buildingService.createBuilding(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BuildingResponse>> getOne(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(buildingService.getBuilding(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BuildingResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(buildingService.getAllBuildings()));
    }
}
```

---

## 6. Quy Tắc Bắt Buộc

### Git workflow
```
feature/xxx  →  Pull Request  →  backend  →  (cuối dự án) main
```

1. Luôn tạo nhánh từ `backend`, KHÔNG bao giờ code thẳng vào `backend` hoặc `main`.
2. Mỗi nhánh tập trung 1 module, đừng động vào code của người khác.
3. Trước khi tạo PR, phải `git pull origin backend` để merge code mới nhất.
4. Commit message rõ ràng: `feat: add ParkingBuilding CRUD API`, `fix: null pointer in BookingService`.

### Coding rules
- Dùng `@RequiredArgsConstructor` thay `@Autowired` (constructor injection).
- Tất cả entity phải `extends BaseEntity` để có `created_at`/`updated_at` tự động.
- Dùng `ApiResponse<T>` (đã có sẵn) để wrap tất cả response.
- Tất cả API phải có Swagger annotation `@Tag`, `@Operation`.
- Validate input bằng `@Valid` + annotation như `@NotBlank`, `@NotNull`, `@Size`.
- Dùng `AppException` + `ErrorCode` (đã có) để throw lỗi — KHÔNG throw `RuntimeException` thô.
- KHÔNG commit `application-dev.yml`.
- KHÔNG commit thư mục `target/`.

---

## 7. Hướng Dẫn Chi Tiết Từng Module

### BE2 — Parking Infrastructure & Vehicle (`feature/parking-infra`)

**Entities cần tạo:** `ParkingBuilding`, `Floor`, `Zone`, `ParkingSlot`, `Gate`, `VehicleType`, `Vehicle`

**Lưu ý quan trọng:**
- `User.java` đã dùng `@Table(name = "users")` (đổi để tránh reserved word MySQL). Khi map FK sang user thì dùng `users.user_id`.
- `Zone` có FK tới cả `floor` và `vehicle_type` — khai báo `@ManyToOne` cho cả 2.
- `ParkingSlot.status` là enum: `AVAILABLE`, `RESERVED`, `OCCUPIED`, `MAINTENANCE`.
- `Vehicle.ownerUserId` → `@ManyToOne @JoinColumn(name = "owner_user_id")` tới `User`.

**APIs cần làm:**
- `POST/GET/PUT/DELETE /api/buildings`
- `POST/GET/PUT/DELETE /api/buildings/{id}/floors`
- `POST/GET/PUT/DELETE /api/floors/{id}/zones`
- `POST/GET/PUT/DELETE /api/zones/{id}/slots`
- `POST/GET/PUT/DELETE /api/gates`
- `POST/GET/PUT/DELETE /api/vehicles` (DRIVER tự quản lý xe của họ)
- `GET /api/vehicle-types`

**Checklist:**
- [ ] Tạo entity cho tất cả bảng trên
- [ ] Tạo repository cho từng entity
- [ ] Tạo request/response DTO
- [ ] Tạo service + impl
- [ ] Tạo controller với đúng `@PreAuthorize` theo role
- [ ] Test bằng Swagger

---

### BE3 — Booking & Parking Session (`feature/booking-session`)

**Entities cần tạo:** `Booking`, `ParkingSession`, `Ticket`, `GateLog`, `OcrScan`

**Lưu ý quan trọng:**
- `ParkingSession` có 2 FK tới `gate`: `entry_gate_id` và `exit_gate_id`. Phải đặt tên tường minh:
```java
@ManyToOne
@JoinColumn(name = "entry_gate_id")
private Gate entryGate;

@ManyToOne
@JoinColumn(name = "exit_gate_id")
private Gate exitGate;
```
- `Booking.status` có 6 giá trị: `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `EXPIRED`, `CANCELLED`, `COMPLETED`.
- `Booking` nullable: `booking_id` trong `ParkingSession` là nullable (walk-in thì không có booking).
- `OcrScan` là table phức tạp nhất — có thể implement sau cùng.
- Cần viết `@Scheduled` task để tự động expire booking sau `expired_at`.

**APIs cần làm:**
- `POST /api/bookings` — tạo booking (user tự đặt)
- `GET /api/bookings/{id}` — xem chi tiết
- `PUT /api/bookings/{id}/cancel` — hủy booking
- `POST /api/sessions/entry` — xe vào (nhân viên/staff dùng)
- `POST /api/sessions/{id}/exit` — xe ra
- `GET /api/sessions/{id}` — xem session
- `GET /api/tickets/{code}` — tra cứu vé theo mã

**Checklist:**
- [ ] Entities + Repositories
- [ ] Booking CRUD API
- [ ] Session entry/exit API
- [ ] Ticket issuance khi tạo session
- [ ] Scheduler expire booking
- [ ] Test flow: tạo booking → check-in → check-out

---

### BE4 — Payment & Support Services (`feature/payment-report`)

**Entities cần tạo:** `PricingPolicy`, `Payment`, `Request`, `ExceptionCase`, `Notification`, `Shift`, `StaffShift`, `SystemConfig`

**Lưu ý quan trọng:**
- `Payment` liên kết với `ParkingSession` — chỉ tạo payment khi session `WAITING_PAYMENT`.
- Tính phí: lấy `PricingPolicy` phù hợp theo `vehicle_type_id` + giờ vào/ra + ngày thường/cuối tuần.
- `Request` có 2 FK tới `users`: `user_id` (người gửi) và `assigned_staff_id` (nhân viên xử lý).
- `Notification` chỉ cần lưu vào DB, chưa cần WebSocket.
- `SystemConfig` dùng để lưu cấu hình động (ví dụ thời gian grace period, phí phạt...).

**APIs cần làm:**
- `POST/GET/PUT/DELETE /api/pricing-policies`
- `POST /api/payments` — tạo payment cho session
- `GET /api/payments/{id}` — xem chi tiết payment
- `GET /api/sessions/{id}/payment` — payment của 1 session
- `POST /api/requests` — user tạo yêu cầu hỗ trợ
- `PUT /api/requests/{id}/assign` — assign staff
- `PUT /api/requests/{id}/resolve` — giải quyết
- `GET /api/notifications` — lấy thông báo của user hiện tại
- `PUT /api/notifications/{id}/read` — đánh dấu đã đọc
- `GET /api/reports/revenue` — báo cáo doanh thu (MANAGER/ADMIN)
- `POST/GET/PUT/DELETE /api/shifts`
- `POST /api/staff-shifts` — phân ca

**Checklist:**
- [ ] Entities + Repositories
- [ ] Pricing policy CRUD
- [ ] Payment creation + fee calculation
- [ ] Request management
- [ ] Notification CRUD
- [ ] Shift + StaffShift management
- [ ] Revenue report endpoint

---

## 8. Database — Cách Dùng Chung

**Cách làm đơn giản nhất cho nhóm học:** mỗi người chạy file SQL trên máy local của mình.

Không cần server DB chung (phức tạp, dễ conflict). Mọi người chạy cùng 1 file `parking_db_schema.sql` → DB giống hệt nhau.

**Khi có thay đổi schema:**
1. Người thay đổi update file `parking_db_schema.sql` trong thư mục `docs/`.
2. Thông báo team để mọi người chạy lại migration (hoặc ALTER TABLE thủ công).
3. Vì `ddl-auto: update` trong config, Hibernate sẽ tự thêm column/table mới — nhưng KHÔNG tự xóa. Thêm cột thì OK, nhưng đổi tên thì phải DROP thủ công.

**Lưu ý về `application.yml`:**
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update   # Tự tạo/update bảng theo entity
```
Nghĩa là khi chạy lần đầu, nếu chưa có bảng, Hibernate sẽ tạo tự động. Nhưng vẫn khuyến khích chạy file SQL trước để đảm bảo đúng schema + seed data.

---

## 9. Test API

Sau khi chạy app, mở: `http://localhost:8080/swagger-ui.html`

**Để test API cần auth:**
1. Gọi `POST /api/auth/login` với `{ "username": "admin", "password": "..." }`.
2. Copy JWT token từ response.
3. Trong Swagger: click "Authorize" → nhập `Bearer <token>`.
4. Giờ có thể gọi các API cần quyền.

---

## 10. Lưu Ý Cuối

- Tuần W4 này: BE1 đã xong nhánh `feature/auth`, đã push lên `backend`. BE2, BE3, BE4 **pull `backend` về trước khi tạo nhánh mới**.
- Khi cần dùng `User` entity trong code của mình, KHÔNG copy lại — import từ package `com.swp391.parking.entity.User`.
- `AppException` và `ApiResponse` đã có sẵn, dùng luôn — đừng tự tạo class tương tự.
- Mỗi cuối ngày commit code lên nhánh của mình, dù chưa xong — để leader có thể review tiến độ.
- Trước khi merge vào `backend`, tạo **Pull Request** trên GitHub và tag leader review.

---

*File này được generate từ toàn bộ docs + source code của project. Nếu có gì chưa rõ, hỏi BE1 leader hoặc xem thêm `docs/BackendArchitecture.md` trong repo.*
