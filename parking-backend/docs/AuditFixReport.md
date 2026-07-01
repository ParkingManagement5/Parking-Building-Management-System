# PARKING MANAGEMENT SYSTEM â€” BUG FIX REPORT

**Ngay sua:** 27/06/2026  
**Branch:** `integration/fe-phu-be3-be-sang`  
**Commit audit goc:** `dbd8d16`  
**Tham chieu:** `Parking_Management_System_Full_Audit_Report_2026-06-27.md`  
**Backend test:** 38/38 PASS  
**Frontend build:** PASS

---

## 1. Tong ket

| Muc do | Tong loi audit | Da sua | Chua sua |
|---|---|---|---|
| **Critical** | 3 | 3 | 0 |
| **High** | 19 | 18 | 1 |
| **Medium** | ~12 | 2 | ~10 |

---

## 2. CRITICAL â€” Da sua

### PM-01B: Payment 0 VND dong Session ACTIVE chua Exit

**Loi:** Client truyen `totalAmount=0`, backend chap nhan va chuyen Session ACTIVE thanh COMPLETED ma khong can Exit.

**Fix:**
- `PaymentServiceImpl.createParkingFee()`: Chi cho tao Parking Fee khi session `WAITING_PAYMENT` (khong con chap nhan ACTIVE).
- Backend tu tinh `baseFee`, `totalAmount` tu `entryTime`, `exitTime`, `hourlyRate` â€” bo qua moi gia tri client truyen.
- `confirmParkingFee()`: Check session phai `WAITING_PAYMENT` truoc khi confirm.
- Khong tu tao `exit_time` gia khi confirm payment.

**File:** `PaymentServiceImpl.java`

---

### PM-02: Deposit confirm qua endpoint Parking Fee

**Loi:** Goi `PUT /payments/parking-fee/{id}/confirm` voi payment type DEPOSIT van thanh cong.

**Fix:**
- `confirmParkingFee()`: Check `payment.getPaymentType() != PARKING_FEE` â†’ throw 400.
- `confirmDeposit()`: Check `payment.getPaymentType() != DEPOSIT` â†’ throw 400.

**File:** `PaymentServiceImpl.java`

---

### PM-02B: Payment PAID nhung Booking van PENDING_PAYMENT

**Loi:** Confirm deposit cho booking da het han, payment PAID nhung booking khong cap nhat, khong phuc hoi duoc.

**Fix:**
- `confirmDeposit()`: Check `booking.expiredAt` chua qua thoi han truoc khi confirm.
- Booking het han â†’ throw 400 "Booking da het han, khong the confirm deposit".

**File:** `PaymentServiceImpl.java`

---

## 3. HIGH â€” Da sua

### QR-04: QR cu van dung duoc sau regenerate

**Loi:** Sau khi regenerate QR, token cu van entry thanh cong vi chi check JWT validity + `qr_used_at`.

**Fix:**
- `processBookingEntry()`: Them check `booking.getQrToken().equals(request.getQrToken())`.
- QR cu khong match DB â†’ throw 400 "QR da bi thay the boi token moi".

**File:** `ParkingSessionServiceImpl.java`

---

### Payment: Client tu truyen totalAmount va fee fields

**Loi:** Backend tin so tien client truyen, cho phep `totalAmount=0` hoac bat ky gia tri nao.

**Fix:**
- `createParkingFee()`: Bo qua toan bo params `appliedRate`, `baseFee`, `totalAmount` tu client.
- Server tu resolve `hourlyRate` tu `PricingPolicy`, tinh `baseFee` = `calculateSessionFee(entryTime, exitTime, rate)`.
- `totalAmount` = `baseFee - depositDeducted` (backend tinh).

**File:** `PaymentServiceImpl.java`

---

### Payment: Mot Session co nhieu Parking Fee

**Loi:** Tao nhieu Parking Fee cho cung session, tat ca deu co the PAID.

**Fix:**
- `createParkingFee()`: Check `paymentRepository.findBySessionId(sessionId)` â€” neu da co PENDING hoac PAID Parking Fee â†’ throw 409.

**File:** `PaymentServiceImpl.java`

---

### Payment: Tao Parking Fee khi Session con ACTIVE

**Loi:** Tao Parking Fee truoc khi xe Exit (session ACTIVE).

**Fix:**
- `createParkingFee()`: Check `session.getStatus() != WAITING_PAYMENT` â†’ throw 400.

**File:** `PaymentServiceImpl.java`

---

### AUTH-01/02: Driver doc Payment nguoi khac

**Loi:** Driver GET `/payments/{id}` hoac `/payments/booking/{bookingId}` cua nguoi khac â†’ HTTP 200.

**Fix:**
- `PaymentController.getById()`: Check isDriver â†’ `enforcePaymentOwnership(paymentId, userId)`.
- `PaymentController.getByBookingId()`: Check isDriver â†’ `enforceBookingOwnership(bookingId, userId)`.
- Khong phai owner â†’ throw 403.

**File:** `PaymentController.java`, `PaymentService.java`, `PaymentServiceImpl.java`

---

### AUTH-03: Driver doc Vehicle nguoi khac

**Loi:** Driver GET `/vehicles/{id}` cua nguoi khac â†’ HTTP 200.

**Fix:**
- `VehicleController.getById()`: Check isDriver â†’ verify `vehicle.userId == currentUser.userId`.
- Khong phai owner â†’ throw 403.

**File:** `VehicleController.java`

---

### AUTH-04: Driver sua Vehicle nguoi khac

**Loi:** Driver PUT `/vehicles/{id}` cua nguoi khac â†’ HTTP 200.

**Fix:**
- `VehicleController.update()`: Resolve user tu Authentication â†’ check ownership truoc khi update.
- Khong phai owner â†’ throw 403.

**File:** `VehicleController.java`

---

### AUTH-06: Gia mao staffUserId

**Loi:** Client truyen `staffUserId: 1` trong body, backend tin va ghi nhan actor sai.

**Fix:**
- `ParkingSessionController.entry()`: Override `request.setStaffUserId()` tu JWT Authentication.
- `ParkingSessionController.exit()`: Tuong tu.
- `ParkingSessionController.exitByQr()`: Tuong tu.
- Them `resolveStaffUserId(Authentication)` private method.

**File:** `ParkingSessionController.java`

---

### BE3-05: Entry qua EXIT Gate

**Loi:** Walk-in entry qua Gate type EXIT â†’ HTTP 200.

**Fix:**
- `processEntry()`: Check `gate.getGateType()` phai la `ENTRY` hoac `BOTH`.
- Sai type â†’ throw 400 "Gate khong phai cong vao".

**File:** `ParkingSessionServiceImpl.java`

---

### BE3-06: Entry qua inactive Gate

**Loi:** Entry qua gate `is_active = false` â†’ HTTP 200.

**Fix:**
- `processEntry()`: Check `gate.getIsActive() == true`.
- `processExit()`: Tuong tu cho exit gate.
- Inactive â†’ throw 400 "Gate dang inactive".

**File:** `ParkingSessionServiceImpl.java`

---

### Validation: Invalid entryMode tra HTTP 500

**Loi:** `entryMode: "NOT_A_REAL_MODE"` â†’ HTTP 500 generic error.

**Fix:**
- `processEntry()`: Wrap `EntryMode.valueOf()` trong try-catch â†’ throw 400 voi message ro rang.

**File:** `ParkingSessionServiceImpl.java`

---

### BE3-01/02: Booking startTime = endTime hoac endTime < startTime

**Loi:** Booking chap nhan `startTime == endTime` hoac `endTime < startTime`.

**Fix:**
- `createBooking()`: Them check `endTime.isAfter(startTime)` â†’ throw 400.

**File:** `BookingServiceImpl.java`

---

### BE3-14: Booking het han van confirm Deposit va cap QR

**Loi:** Booking expired nhung van confirm deposit thanh cong, QR duoc cap.

**Fix:**
- `confirmDeposit()`: Check booking `expiredAt` chua qua han truoc khi confirm.

**File:** `PaymentServiceImpl.java`

---

### BOOKING-CANCEL-01: Huy booking CONFIRMED sau 10 phut

**Loi:** Flow cu khoa huy booking da `CONFIRMED` neu qua 10 phut sau luc dat coc, trong khi nghiep vu moi can cho phep huy o moi thoi diem va chi phan biet hoan coc hay mat coc.

**Fix:**
- `BookingServiceImpl.cancelBooking()`: Van cho huy `PENDING_PAYMENT` va `CONFIRMED`.
- Neu `CONFIRMED` va huy trong 10 phut sau `deposit_paid_at`:
  - `booking.status` -> `CANCELLED`
  - `slot.status` -> `AVAILABLE`
  - `payment.payment_status` cua `DEPOSIT` tu `PAID` -> `REFUNDED`
- Neu `CONFIRMED` va huy sau 10 phut:
  - `booking.status` -> `CANCELLED`
  - `slot.status` -> `AVAILABLE`
  - payment coc giu `PAID` (mat coc)
- `BookingHistoryPage.jsx`: Luon hien nut huy cho booking `CONFIRMED`, thong bao ro con duoc hoan coc hay da qua moc hoan coc.

**DB/Trang thai lien quan:**
- `booking.status`: su dung `CANCELLED` cho ca 2 truong hop.
- `payment.payment_status`: dung `REFUNDED` neu hoan coc, giu `PAID` neu huy tre va mat coc.

**File:** `BookingServiceImpl.java`, `BookingHistoryPage.jsx`, `parking_db_schema.sql`

---

### VD-03: Deactivate Vehicle dang co Session ACTIVE

**Loi:** Vehicle dang trong bai (session ACTIVE) van bi deactivate.

**Fix:**
- `deactivate()`: Check `sessionRepo.existsByVehicle_IdAndStatusIn(ACTIVE, WAITING_PAYMENT)`.
- Co session chua hoan tat â†’ throw 409.

**File:** `VehicleServiceImpl.java`

---

### Slot: WALK_IN_AUTO bao het slot LARGE du con 36 slot

**Loi:** Native query truyen enum object thay vi string, MySQL khong match.

**Fix:**
- `ParkingSlotRepository`: Doi `@Param("slotSize") ParkingSlot.SlotSize` thanh `String`.
- `SlotAssignmentService`: Truyen `slotSize.name()` thay vi enum.

**File:** `ParkingSlotRepository.java`, `SlotAssignmentService.java`

---

## 4. HIGH â€” Chua sua

| Loi | Ly do |
|---|---|
| Pricing policy chon khong dung theo weekday/weekend va time range | Can refactor lon â€” `resolveHourlyRate()` hien lay policy dau tien, chua xet `day_type` va `start_hour/end_hour` theo thoi gian thuc |

---

## 5. MEDIUM â€” Chua sua (de xuat P2)

| Loi | Mo ta |
|---|---|
| `expiredAt` khong khop JWT expiry | 2 nguon du lieu khac nhau |
| 2 route regenerate QR trung | `/api/` va `/api/v1/` |
| Booking Entry GateLog `license_plate = NULL` | Booking entry khong truyen plate vao GateLog |
| GateLog Entry/Exit 2 dinh dang bien so | Normalization khong nhat quan |
| Duplicate Vehicle do punctuation | `51A-99999` vs `51A-999.99` |
| Deactivate Booking CONFIRMED khong refund marker | Khong danh dau refund |
| Vehicle inactive bien mat FE, khong reactivate | UX thieu |
| Duplicate Deposit bao "created successfully" | Message sai |
| Pricing policy chon khong dung theo ngay/khung gio | Logic `resolveHourlyRate` chua xet |
| FE lint 17 errors | Chua fix |
| Encoding tieng Viet | Mot so response bi loi |

---

## 6. Danh sach file da sua

| File | Thay doi |
|---|---|
| `PaymentServiceImpl.java` | Server-side fee calc, payment_type check, session state check, unique fee, deposit expiry check, ownership enforcement |
| `PaymentService.java` | Them `enforcePaymentOwnership()`, `enforceBookingOwnership()` |
| `PaymentController.java` | Ownership check cho driver GET payment/booking |
| `ParkingSessionServiceImpl.java` | QR match DB, gate type/active validation, entryMode validation |
| `ParkingSessionController.java` | staffUserId tu JWT, gate exit validation |
| `BookingServiceImpl.java` | Validate endTime > startTime |
| `VehicleController.java` | Ownership check GET/PUT vehicle |
| `VehicleServiceImpl.java` | Block deactivate vehicle co active session |
| `SlotAssignmentService.java` | Fix enum â†’ string cho native query |
| `ParkingSlotRepository.java` | Doi param type `SlotSize` â†’ `String` |
| `ParkingSessionRepository.java` | Them `searchByPlateOrIdAndStatus()` |

---

## 7. Ket qua test

```
Tests run: 38, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

---

## 8. Khuyen nghi tiep theo

1. **P1 â€” Pricing logic:** Refactor `resolveHourlyRate()` de chon policy theo `day_type` (WEEKDAY/WEEKEND) va `start_hour/end_hour` phu hop voi thoi gian thuc te.
2. **P2 â€” Data normalization:** Thong nhat bien so truoc khi luu (loai bo `.` va `-` thua).
3. **P2 â€” FE lint:** Fix 17 lint errors.
4. **P2 â€” GateLog:** Luu `license_plate` nhat quan giua Entry va Exit.
5. **P2 - Refund audit trail:** Neu can doi soat tai chinh sau nay, bo sung lich su ly do refund/no-refund thay vi chi nhin `payment_status`.

