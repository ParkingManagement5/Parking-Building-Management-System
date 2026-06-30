# DB Status Flow Audit

Ngay audit: 2026-06-30

Pham vi: doi chieu cac trang thai lien quan truc tiep den DB trong `parking-backend`, tap trung vao:

- `booking`
- `parking_session`
- `payment`
- `ocr_scan`
- `exception_case`
- `parking_slot` o cac diem bi anh huong boi cac flow tren

Lenh da chay de verify:

```powershell
cd parking-backend
mvn.cmd test
```

Ket qua:

- `Tests run: 47, Failures: 0, Errors: 0, Skipped: 0`
- `mvn.cmd -q -DskipTests compile`: pass

Luu y cap nhat:

- Phan `2` den `10` la audit logic goc + cac khoang trong tai thoi diem bat dau ra soat.
- Phan `11` tro di la tien do rollout da duoc cap nhat thuc te theo tung dot.
- Tinh den hien tai, cac uu tien `1`, `2`, `3` da hoan thanh va da co test backend pass.

## 1. Tong ket nhanh

Flow booking/session/payment hien tai nhin chung chay thong va da co test integration cover cac nhanh quan trong nhat:

- booking vao bai bang QR
- lookup bien so theo canonical plate
- xe ra chuyen sang `WAITING_PAYMENT`
- thanh toan xong chuyen `COMPLETED`
- booking `CONFIRMED` chi duoc huy tay trong 10 phut sau khi coc

Nhung van con nhieu trang thai ton tai trong enum/DB ma chua thay flow ghi DB hoac chua co test ro rang:

- `OcrScan.ProcessStatus.CORRECTED_AFTER_APPROVAL`

Luu y:

- cac muc `PaymentStatus.FAILED`, `PaymentStatus.REFUNDED`, `ExceptionStatus.CLOSED`, va `walk-in lifecycle` da duoc khoa o cac dot rollout ben duoi
- `ParkingSession.SessionStatus.EXCEPTION` da duoc loai khoi flow van hanh o dot 6

## 2. Booking Status Audit

Nguon chinh:

- `parking-backend/src/main/java/com/swp391/parking/entity/Booking.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/BookingServiceImpl.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/ParkingSessionServiceImpl.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/PaymentServiceImpl.java`

### 2.1 Enum hien co

- `PENDING_PAYMENT`
- `CONFIRMED`
- `CHECKED_IN`
- `WAITING_PAYMENT`
- `EXPIRED`
- `CANCELLED`
- `COMPLETED`

### 2.2 Transition thuc te dang co

| From | To | Trigger | Ghi DB lien quan | Danh gia |
|---|---|---|---|---|
| none | `PENDING_PAYMENT` | `createBooking()` | tao booking moi, slot van phai `AVAILABLE` luc create | OK |
| `PENDING_PAYMENT` | `CONFIRMED` | `confirmBookingAfterPayment()` | set `qrToken`, `qrIssuedAt`, `depositPaidAt`, slot -> `RESERVED` | OK |
| `PENDING_PAYMENT` | `EXPIRED` | `expireStaleOpenBookings()` hoac scheduler | expire theo `expiredAt` | OK |
| `PENDING_PAYMENT` | `CANCELLED` | `cancelBooking()` | khong can giai phong slot vi chua `RESERVED` | OK |
| `CONFIRMED` | `CHECKED_IN` | `processBookingEntry()` | set `qrUsedAt`, slot -> `OCCUPIED`, tao session `ACTIVE` | OK |
| `CONFIRMED` | `CANCELLED` | `cancelBooking()` trong 10 phut sau `depositPaidAt` | slot `RESERVED` -> `AVAILABLE` | OK |
| `CONFIRMED` | `EXPIRED` | scheduler no-show | neu qua `bookingStartTime + 30p`, slot `RESERVED` -> `AVAILABLE` | OK |
| `CHECKED_IN` | `WAITING_PAYMENT` | `processExit()` | booking linked voi session khi xe ra | OK |
| `WAITING_PAYMENT` | `COMPLETED` | `confirmParkingFee()` -> `completeSessionAfterParkingFee()` | booking + session complete, slot -> `AVAILABLE` | OK |

### 2.3 Test da cover

- `Be3FlowIntegrationTest.java:190`
  - `plateVariantsShouldFindConfirmedBookingAndPreventWalkInDuplicate`
  - cover lookup booking `CONFIRMED` va chan walk-in duplicate
- `Be3FlowIntegrationTest.java:244`
  - `bookingEntrySessionLookupAndExitQrShouldUseCanonicalPlateComparison`
  - cover `CONFIRMED -> CHECKED_IN -> WAITING_PAYMENT`
- `Be3FlowIntegrationTest.java:326`
  - `normalBookingEntryAndExitShouldStillWorkWithExactPlate`
  - cover flow booking chuan
- `Be3FlowIntegrationTest.java:370`
  - `confirmedBookingShouldAllowCancelWithinTenMinutesAfterDepositPayment`
- `Be3FlowIntegrationTest.java:393`
  - `confirmedBookingShouldRejectCancelAfterTenMinutesFromDepositPayment`
- `ControllerIntegrationTest.java:201`
  - `bookingControllerShouldReturnCurrentUsersBookings`
  - cover doc booking `PENDING_PAYMENT`

### 2.4 Khoang trong/rui ro

- Chua thay test explicit cho:
  - `PENDING_PAYMENT -> EXPIRED`
  - `CONFIRMED -> EXPIRED` do no-show scheduler
  - `WAITING_PAYMENT -> COMPLETED` voi booking linked duoc assert truc tiep
- `confirmBookingAfterPayment()` dang set `expiredAt` = `bookingEndTime` hoac `now+2h`, nhung no-show thuc te lai dua vao `bookingStartTime + 30p`. Logic hien tai chay duoc vi scheduler da doi sang `findConfirmedNoShow`, nhung `expiredAt` cua booking confirmed khong con la nguon su that chinh nua.

## 3. Parking Session Status Audit

Nguon chinh:

- `parking-backend/src/main/java/com/swp391/parking/entity/ParkingSession.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/ParkingSessionServiceImpl.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/PaymentServiceImpl.java`

### 3.1 Enum hien co

- `ACTIVE`
- `WAITING_PAYMENT`
- `COMPLETED`

### 3.2 Transition thuc te dang co

| From | To | Trigger | Ghi DB lien quan | Danh gia |
|---|---|---|---|---|
| none | `ACTIVE` | `processBookingEntry()` | session booking vao bai | OK |
| none | `ACTIVE` | `processWalkInEntry()` | session walk-in vao bai | OK |
| `ACTIVE` | `WAITING_PAYMENT` | `processExit()` | set `exitGate`, `exitTime`, cho thanh toan | OK |
| `WAITING_PAYMENT` | `COMPLETED` | `confirmParkingFee()` | slot -> `AVAILABLE`, booking -> `COMPLETED` neu co | OK |

### 3.3 Test da cover

- `Be3FlowIntegrationTest.java:135`
  - `exitShouldKeepSlotOccupiedUntilParkingFeeIsPaid`
  - cover `ACTIVE -> WAITING_PAYMENT -> COMPLETED`
- `Be3FlowIntegrationTest.java:244`
  - cover booking session lookup + exit QR canonical comparison
- `Be3FlowIntegrationTest.java:326`
  - cover booking flow binh thuong

### 3.4 Khoang trong/rui ro

- Da bo sung test explicit cho walk-in entry/exit lifecycle den `COMPLETED` o dot 3.
- `processExit()` cho walk-in di tiep du khong co QR, con booking session bat buoc `qrVerified = true`. Rule nay dung nghiep vu, nhung nen co them test explicit cho walk-in exit khong QR de tranh regressions.

## 4. Payment Status Audit

Nguon chinh:

- `parking-backend/src/main/java/com/swp391/parking/entity/Payment.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/PaymentServiceImpl.java`

### 4.1 Enum hien co

- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED`

### 4.2 Transition thuc te dang co

| From | To | Trigger | Ghi DB lien quan | Danh gia |
|---|---|---|---|---|
| none | `PENDING` | `createDeposit()` | tao payment DEPOSIT | OK |
| `PENDING` | `PAID` | `confirmDeposit()` | sau do goi `confirmBookingAfterPayment()` | OK |
| `PENDING` | `FAILED` | `markFailed()` | chi mark fail, khong mutate booking/session | OK |
| none | `PENDING` | `createParkingFee()` | chi cho session `WAITING_PAYMENT` | OK |
| `PENDING` | `PAID` | `confirmParkingFee()` | complete session + booking + release slot | OK |
| `PAID` | `REFUNDED` | `refundPayment()` | chi cho refund hop le theo rule booking/session | OK |

### 4.3 Test da cover

- `Be3FlowIntegrationTest.java:135`
  - `exitShouldKeepSlotOccupiedUntilParkingFeeIsPaid`
  - assert payment parking fee `PENDING -> PAID`

### 4.4 Khoang trong/rui ro

- Chua thay test deposit payment lifecycle end-to-end:
  - `createDeposit()`
  - `confirmDeposit()`
  - booking `PENDING_PAYMENT -> CONFIRMED`
- `REFUNDED` hien duoc dung theo huong financial audit:
  - deposit chi refund khi booking da `CANCELLED` hoac `EXPIRED`
  - parking fee chi refund khi session da `COMPLETED`
  - khong tu dong rollback lai session/booking sau refund

## 5. OCR Scan Status Audit

Nguon chinh:

- `parking-backend/src/main/java/com/swp391/parking/entity/OcrScan.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/OcrServiceImpl.java`
- `parking-backend/src/main/java/com/swp391/parking/controller/OcrController.java`
- `parking-frontend/src/pages/staff/UnifiedQrScanPage.jsx`

### 5.1 Enum hien co

- `AUTO_APPROVED`
- `MANUAL_REVIEW`
- `STAFF_APPROVED`
- `CORRECTED_AFTER_APPROVAL`
- `FAILED`

### 5.2 Transition thuc te dang co

| From | To | Trigger | Ghi DB lien quan | Danh gia |
|---|---|---|---|---|
| none | `AUTO_APPROVED` | `createScan()` / `scanImage()` khi confidence >= threshold | luu OCR scan | OK |
| none | `MANUAL_REVIEW` | confidence < threshold | hien tai threshold mac dinh = `0.85` | OK |
| none | `FAILED` | plate null/blank hoac confidence null | scan van duoc luu | OK |
| `MANUAL_REVIEW` | `STAFF_APPROVED` | `reviewScan()` staff confirm/sua | set `correctedByUserId`, `correctedAt` | OK |
| `AUTO_APPROVED` | `CORRECTED_AFTER_APPROVAL` | `reviewScan()` tren scan da auto approved va staff sua lai | code support | Partial |

### 5.3 Ghi chu van hanh hien tai

- Sau sua doi gan day, low confidence OCR tren staff scan page se duoc review ngay tai cho.
- Neu staff xac nhan duoc bien:
  - OCR record duoc `reviewScan()`
  - flow tiep tuc `autoLookup()`
- Neu staff khong xac minh duoc:
  - tao `PLATE_UNVERIFIED` exception

### 5.4 Khoang trong/rui ro

- Da bo sung integration test backend cho:
  - `MANUAL_REVIEW -> STAFF_APPROVED`
  - `FAILED`
  - `AUTO_APPROVED -> CORRECTED_AFTER_APPROVAL`
- `CORRECTED_AFTER_APPROVAL` da duoc khoa bang test backend, nhung UI hien tai van chua co flow rieng de staff sua lai scan da auto-approve trong van hanh thuong ngay.
- `FAILED` khong duoc noi thanh queue OCR rieng; frontend fallback sang nhap tay/exception.

## 6. Exception Case Status Audit

Nguon chinh:

- `parking-backend/src/main/java/com/swp391/parking/entity/ExceptionCase.java`
- `parking-backend/src/main/java/com/swp391/parking/service/impl/ExceptionCaseServiceImpl.java`
- `parking-frontend/src/pages/staff/ExceptionCasePage.jsx`
- `parking-frontend/src/pages/staff/UnifiedQrScanPage.jsx`

### 6.1 Enum hien co

Trang thai:

- `OPEN`
- `IN_PROGRESS`
- `RESOLVED`
- `CLOSED`

Loai case:

- `LOST_QR`
- `WRONG_FEE`
- `CANNOT_FIND_CAR`
- `SYSTEM_ERROR`
- `OTHER`
- `PLATE_UNVERIFIED`
- `BOOKING_MISMATCH`
- `EXIT_VERIFICATION_FAILED`
- `SESSION_CONFLICT`

### 6.2 Transition thuc te dang co

| From | To | Trigger | Ghi DB lien quan | Danh gia |
|---|---|---|---|---|
| none | `OPEN` | `createExceptionCase()` | tao case moi + notify all staff | OK |
| `OPEN` | `IN_PROGRESS` | `assignToStaff()` | hien backend luu vao field `resolvedBy` | Partial |
| `IN_PROGRESS` or `OPEN` | `RESOLVED` | `resolveExceptionCase()` | set `resolvedAt` | OK |
| any | `CLOSED` | `closeExceptionCase()` | backend co endpoint | Partial |

### 6.3 Khoang trong/rui ro

- Ten cot `resolvedBy` dang duoc dung ca cho assign va resolve.
  - Nghia la DB chua tach ro `assignedTo` voi `resolvedBy`.
  - Neu can audit ky, nen doi model.
- UI staff hien tai da co:
  - load `OPEN` + `IN_PROGRESS`
  - `Assign to me`
  - `Resolve`
  - khu `Resolved Gan Day` + action `Close`
- Da co test integration cho exception lifecycle o dot 1.

## 7. Parking Slot Status Audit

Trang thai slot bi anh huong gián tiep boi booking/session/payment:

- `AVAILABLE`
- `RESERVED`
- `OCCUPIED`
- `MAINTENANCE`

### 7.1 Transition thuc te dang co

| From | To | Trigger | Ghi chu | Danh gia |
|---|---|---|---|---|
| `AVAILABLE` | `RESERVED` | booking confirm payment | booking `CONFIRMED` | OK |
| `RESERVED` | `OCCUPIED` | booking check-in | tao session `ACTIVE` | OK |
| `AVAILABLE` | `OCCUPIED` | walk-in entry | auto/manual slot assignment | OK |
| `OCCUPIED` | `AVAILABLE` | confirm parking fee | session `COMPLETED` | OK |
| `RESERVED` | `AVAILABLE` | cancel confirmed booking trong 10p | release slot | OK |
| `RESERVED` | `AVAILABLE` | confirmed no-show expire | scheduler/service fallback | OK |

### 7.2 Test da cover

- `Be3FlowIntegrationTest.java:135`
  - assert slot van occupied sau exit cho toi khi payment duoc xac nhan
- `Be3FlowIntegrationTest.java:190`
  - assert khong tao them session duplicate khi booking da ton tai

### 7.3 Khoang trong/rui ro

- Chua thay test explicit cho:
  - `RESERVED -> AVAILABLE` do no-show scheduler
  - `RESERVED -> AVAILABLE` do cancel trong 10p

## 8. Danh sach trang thai orphan/chua thay duoc ghi DB

Nhung trang thai sau co code write nhung chua thay test/flow staff pho bien:

- `OcrScan.ProcessStatus.CORRECTED_AFTER_APPROVAL` da co test backend, nhung chua co UI flow staff rieng

Nhung trang thai sau da duoc noi flow + test trong rollout hien tai:

- `ExceptionCase.ExceptionStatus.CLOSED`
- booking `PENDING_PAYMENT -> EXPIRED`
- booking `CONFIRMED -> EXPIRED`
- walk-in `ACTIVE -> WAITING_PAYMENT -> COMPLETED`
- `Payment.PaymentStatus.FAILED`
- `Payment.PaymentStatus.REFUNDED`

## 9. Ket luan hien trang

### 9.1 Cac flow da on hon

- Booking entry/exit canonical plate: on
- Session `ACTIVE -> WAITING_PAYMENT -> COMPLETED`: on
- Booking cancel window 10 phut: on
- Payment parking fee completion: on
- Low-confidence OCR tren UI staff da duoc noi voi flow scan thuong va exception fallback

### 9.2 Cac diem nen test tiep

Nen bo sung them integration test cho:

1. Deposit payment flow end-to-end
2. OCR statuses:
   - `MANUAL_REVIEW -> STAFF_APPROVED`
   - `FAILED`
3. Neu muon cover sau hon nua:
   - `AUTO_APPROVED -> CORRECTED_AFTER_APPROVAL`
   - query/filter UI cho exception queue

### 9.3 Uu tien sua model neu muon audit dep

Neu muon DB va flow audit dep hon nua, nen uu tien:

1. Tach `assignedTo` khoi `resolvedBy` trong `exception_case`
2. Viet test deposit payment lifecycle end-to-end neu muon full cover hon nua
3. Quyet dinh co can them UI rieng cho `CORRECTED_AFTER_APPROVAL` hay khong

## 10. Nhan xet chot

Neu chi xet cac flow dang duoc su dung thuc te trong staff gate, booking, session, va payment, thi he thong hien tai dang chay dung theo code va test backend da pass.

Nhung neu xet day du tat ca trang thai ton tai trong DB schema, thi van con mot so trang thai chua co flow hoan chinh hoac chua co test chot, nen chua the ket luan la "da test het moi status" theo nghia chat che.

## 11. Thu Tu Uu Tien De Dat Muc 100%

Muc tieu phan nay:

- lam theo thu tu it rui ro nhat
- moi buoc xong deu co cach check ro rang
- co the dung de bao cao tien do theo tung dot

### Uu tien 1: Hoan thien `Exception.CLOSED`

Trang thai trien khai:

- Hoan thanh dot 1 vao 2026-06-30
- Da them rule backend:
  - chi `OPEN` moi duoc `assign`
  - chi `IN_PROGRESS` moi duoc `resolve`
  - chi `RESOLVED` moi duoc `close`
- Da them UI:
  - case `RESOLVED` hien o khu `Resolved Gan Day`
  - co nut `Close`
- Da them integration test lifecycle exception
- Ket qua verify:
  - `cmd /c npm run build`: pass
  - `mvn.cmd test`: pass (`48 tests, 0 failures`)

Ly do uu tien:

- backend da co endpoint `close`
- trang thai da co trong DB
- anh huong nho, de chot nhanh

Can lam:

1. Them nut/flow `Close` tren UI exceptions
2. Quy dinh ro:
   - co cho close truc tiep tu `OPEN` hay khong
   - khuyen nghi: chi `RESOLVED` moi duoc `CLOSED`
3. Them test backend cho transition `RESOLVED -> CLOSED`

Done khi:

- staff/manager close duoc case tren UI
- case khong con nam trong danh sach open/in-progress
- query theo status `CLOSED` ra dung du lieu

Cach test thu cong:

1. Tao 1 exception moi tu flow scan hoac goi API
2. Assign case do
3. Resolve case
4. Bam `Close`
5. Refresh trang exceptions
6. Kiem tra case bien mat khoi danh sach dang xu ly
7. Goi API `GET /api/v1/exceptions/status/CLOSED` de xac nhan DB da luu `CLOSED`

Cach test ky thuat:

- them integration test:
  - `OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED`
- verify:
  - `status = CLOSED`
  - `resolvedAt` van giu nguyen

Ghi chu bao cao sau khi xong:

- da kich hoat lifecycle day du cho exception
- `CLOSED` khong con la orphan state

### Uu tien 2: Bo sung test cho booking expiry/no-show

Trang thai trien khai:

- Hoan thanh dot 2 vao 2026-06-30
- Da them 2 integration test:
  - `PENDING_PAYMENT -> EXPIRED`
  - `CONFIRMED -> EXPIRED` do no-show scheduler
- Da goi truc tiep `BookingScheduler` trong test de bam sat logic production
- Ket qua verify:
  - `mvn.cmd test`: pass (`50 tests, 0 failures`)

Ly do uu tien:

- day la flow nghiep vu chinh
- dang chay bang code nhung thieu test chot

Can lam:

1. Test `PENDING_PAYMENT -> EXPIRED`
2. Test `CONFIRMED -> EXPIRED` khi qua `bookingStartTime + 30p`
3. Assert slot release dung:
   - `PENDING_PAYMENT`: slot khong bi giu truoc
   - `CONFIRMED`: slot `RESERVED -> AVAILABLE`

Done khi:

- co test pass cho 2 nhanh expire
- report khong con ghi scheduler expiry la khoang trong

Cach test thu cong:

1. Tao booking `PENDING_PAYMENT` co `expiredAt` trong qua khu
2. Trigger scheduler hoac goi API/list co chay `expireStaleOpenBookings`
3. Kiem tra booking thanh `EXPIRED`
4. Tao booking `CONFIRMED` co `bookingStartTime` qua 30 phut
5. Trigger scheduler
6. Kiem tra:
   - booking thanh `EXPIRED`
   - slot tu `RESERVED` ve `AVAILABLE`

Cach test ky thuat:

- viet integration test/scheduler test cho:
  - stale pending
  - confirmed no-show

Ghi chu bao cao sau khi xong:

- da khoa duoc 2 transition expiry quan trong cua booking
- no-show logic da duoc xac nhan bang test

### Uu tien 3: Hoan thien walk-in lifecycle den `COMPLETED`

Trang thai trien khai:

- Hoan thanh dot 3 vao 2026-06-30
- Da them integration test end-to-end cho walk-in:
  - vao bai bang `WALK_IN_AUTO`
  - bien so nhap tay duoc normalize ve dang canonical
  - xe ra khong can QR
  - tao parking fee
  - confirm payment
  - session -> `COMPLETED`
  - slot -> `AVAILABLE`
  - booking van `null`, khong bi dong cham sai
- Ket qua verify:
  - `mvn.cmd test`: pass (`51 tests, 0 failures`)

Ly do uu tien:

- walk-in la flow van hanh chinh cua staff
- hien logic co san nhung nen co test full lifecycle

Can lam:

1. Them integration test:
   - walk-in entry
   - exit khong QR
   - create parking fee
   - confirm parking fee
   - session `COMPLETED`
   - slot `AVAILABLE`

Done khi:

- co test pass cho walk-in full lifecycle
- booking khong lien quan van khong bi dong cham sai

Cach test thu cong:

1. O trang staff scan, nhap bien xe chua co booking
2. Cho xe vao theo `WALK-IN`
3. Lam flow cho xe ra
4. Xac nhan thanh toan
5. Kiem tra:
   - session `ACTIVE -> WAITING_PAYMENT -> COMPLETED`
   - slot tro lai `AVAILABLE`

Cach test ky thuat:

- them integration test full flow walk-in

Ghi chu bao cao sau khi xong:

- flow walk-in da duoc verify tu entry den complete

### Uu tien 4: Hoan thien `OcrScan.STAFF_APPROVED` va OCR low-confidence audit

Trang thai trien khai:

- Hoan thanh dot 4 vao 2026-06-30
- Da them integration test backend cho:
  - confidence thap -> `MANUAL_REVIEW`
  - staff review -> `STAFF_APPROVED`
  - plate/confidence khong hop le -> `FAILED`
  - auto-approved scan bi staff sua -> `CORRECTED_AFTER_APPROVAL`
- Da xac nhan queue `pending-reviews` chi nhan `MANUAL_REVIEW`
- Ket qua verify:
  - `mvn.cmd test`: pass (`54 tests, 0 failures`)
  - `mvn.cmd -q -DskipTests compile`: pass

Ly do uu tien:

- flow UI da moi sua de review OCR thap ngay tai cho
- can co test/backend check de dam bao logic nay on dinh

Can lam:

1. Test `MANUAL_REVIEW -> STAFF_APPROVED`
2. Test `FAILED` khi OCR khong doc duoc bien
3. Neu muon dung that `CORRECTED_AFTER_APPROVAL`:
   - phai them UI cho staff sua scan da auto approve
   - neu khong dung, xem xet bo enum nay

Done khi:

- low-confidence OCR co test backend
- scan fail co test backend
- `CORRECTED_AFTER_APPROVAL` da duoc khoa bang test backend; UI rieng cho case nay la nang cap tiep theo neu muon staff sua scan da auto-approve

Cach test thu cong:

1. Upload anh OCR confidence thap
2. Kiem tra modal xac nhan bien so hien tai scan page
3. Nhap bien dung va confirm
4. Kiem tra scan khong con nam trong queue `MANUAL_REVIEW`
5. Neu OCR that bai:
   - kiem tra flow nhap tay / tao exception van chay

Cach test ky thuat:

- test service/controller OCR:
  - confidence >= threshold -> `AUTO_APPROVED`
  - confidence < threshold -> `MANUAL_REVIEW`
  - review scan -> `STAFF_APPROVED`
  - null plate/confidence -> `FAILED`

Ghi chu bao cao sau khi xong:

- OCR khong chi chay duoc tren UI ma da co test cover theo DB status

### Uu tien 5: Quyet dinh `Payment.FAILED` va `Payment.REFUNDED`

Trang thai trien khai:

- Hoan thanh dot 5 vao 2026-06-30
- Da implement backend API/service cho:
  - `PENDING -> FAILED`
  - `PAID -> REFUNDED`
- Da them guard:
  - khong cho confirm lai payment da `FAILED` hoac `REFUNDED`
  - failed deposit khong block tao lai deposit moi
  - deposit chi refund khi booking da `CANCELLED` hoac `EXPIRED`
  - parking fee chi refund khi session da `COMPLETED`
- Da them integration test cho:
  - pending deposit -> failed -> tao lai deposit moi
  - paid deposit -> refunded khi booking da cancel
- Ket qua verify:
  - `mvn.cmd test`: pass (`56 tests, 0 failures`)
  - `mvn.cmd -q -DskipTests compile`: pass

Ly do uu tien:

- 2 trang thai nay co trong schema nhung hien chua co flow write
- neu chua co nghiep vu online/refund that su thi khong nen giu mo ho

Hai lua chon:

1. Da chon huong dung that o backend:
   - implement API + service + test
2. UI staff/manager cho refund/fail la nang cap sau neu muon thao tac truc tiep tren portal

Done khi:

- backend da co flow write ro rang
- test da xac nhan khong lam lech booking/session
- bao cao da note ro refund hien la financial audit, khong rollback nghiep vu

Cach test thu cong neu implement:

1. Tao payment `PENDING`
2. Mark `FAILED`
3. Kiem tra booking/session lien quan khong bi complete sai
4. Tao payment `PAID`
5. Refund
6. Kiem tra trang thai `REFUNDED` va du lieu audit

Cach test ky thuat neu implement:

- `PENDING -> FAILED`
- `PAID -> REFUNDED`
- verify khong cho confirm lai payment da fail/refund neu business rule khong cho

Ghi chu bao cao sau khi xong:

- da quyet dinh ro 2 payment state mo rong, khong con mo ho trong schema

### Uu tien 6: Quyet dinh `ParkingSession.EXCEPTION`

Trang thai trien khai:

- Hoan thanh dot 6 vao 2026-06-30
- Da chon huong loai `ParkingSession.EXCEPTION` khoi flow van hanh hien tai
- Da bo `EXCEPTION` ra khoi enum `ParkingSession.SessionStatus`
- Ly do:
  - khong co service nao write state nay
  - khong co UI staff/driver nao xu ly state nay
  - khong co quy tac ro ve slot, booking, payment khi session vao `EXCEPTION`
- Ket qua verify:
  - `mvn.cmd test`: pass (`56 tests, 0 failures`)
  - `mvn.cmd -q -DskipTests compile`: pass

Ly do uu tien:

- day la state de gay roi lifecycle nhat
- nen de cuoi cung khi core flow da on

Hai lua chon:

1. Neu dung that:
   - can thiet ke nghiep vu rat ro
   - session exception dung cho tinh huong nao
   - slot luc do giu hay nha
2. Da chon trong rollout hien tai:
   - bo state nay khoi pham vi he thong hien tai

Done khi:

- da quyet dinh ro rang khong su dung
- state machine cua `ParkingSession` chi con 3 state dang van hanh that: `ACTIVE`, `WAITING_PAYMENT`, `COMPLETED`

Cach test thu cong neu implement:

1. Tao 1 session dang `ACTIVE`
2. Trigger tinh huong loi nghiep vu can treo session
3. Mark `EXCEPTION`
4. Kiem tra:
   - UI thay duoc session loi
   - booking/slot khong bi chuyen trang thai sai
5. Resolve session exception theo rule da dinh

Cach test ky thuat neu implement:

- `ACTIVE -> EXCEPTION`
- `EXCEPTION -> WAITING_PAYMENT` hoac `EXCEPTION -> COMPLETED` tuy rule
- assert consistency cua slot va booking linked

Ghi chu bao cao sau khi xong:

- da quyet dinh so phan session exception, khong con la orphan state

## 12. Mau Bao Cao Tien Do Sau Moi Dot

Sau moi dot lam xong, co the bao cao theo mau sau:

```md
### Dot N - <ten hang muc>

- Muc tieu: ...
- Da lam:
  - ...
  - ...
- Trang thai DB da duoc chot:
  - ...
- UI/API da them:
  - ...
- Test da chay:
  - mvn.cmd test
  - test case moi: ...
- Ket qua:
  - pass/fail
- Ghi chu/rui ro con lai:
  - ...
```

## 13. Checklist Kiem Tra Nhanh Sau Moi Buoc

Checklist chung:

1. Chay `mvn.cmd test`
2. Chay `mvn.cmd -q -DskipTests compile`
3. Neu co doi UI:
   - chay `cmd /c npm run build`
4. Test thu cong dung flow tuong ung
5. Kiem tra DB state logic:
   - booking
   - session
   - slot
   - payment
   - ocr
   - exception
6. Cap nhat file nay:
   - danh dau hang muc da xong
   - note ket qua test
   - note van de phat hien

## 14. Thu Tu Khuyen Nghi Chot Cuoi

Neu muon dat muc 100% mot cach thuc dung, nen di theo thu tu nay:

1. `Exception.CLOSED`
2. Booking expiry/no-show tests
3. Walk-in lifecycle tests
4. OCR low-confidence status tests
5. Quyet dinh `Payment.FAILED` va `Payment.REFUNDED`
6. Quyet dinh `ParkingSession.EXCEPTION`

Ly do:

- 4 muc dau giup khoa phan flow chinh va phan audit dang dung thuc te
- 2 muc cuoi la phan mo rong/phan orphan, nen de sau khi core da chac

## 15. Trang Thai Tong The Sau 6 Dot

- Dot 1: `Exception.CLOSED` - xong
- Dot 2: booking expiry/no-show - xong
- Dot 3: walk-in lifecycle - xong
- Dot 4: OCR status audit - xong
- Dot 5: `Payment.FAILED` va `REFUNDED` - xong
- Dot 6: `ParkingSession.EXCEPTION` - xong

Ket luan hien tai:

- state machine chinh dang van hanh that da duoc khoa kha chac bang code + test
- orphan state lon nhat da duoc giai quyet
- no con lai chu yeu la:
  - polish model exception (`assignedTo` vs `resolvedBy`)
  - test deposit lifecycle end-to-end neu muon cover dep hon nua
  - UI rieng cho `CORRECTED_AFTER_APPROVAL` neu muon staff sua scan auto-approved

## 16. File Review Matrix

Bang nay dung de xem nhanh file nao da on, file nao con no.

| File | Hang muc | Trang thai | Nhan xet |
|---|---|---|---|
| `parking-backend/src/main/java/com/swp391/parking/ParkingBackendApplication.java` | scheduler | `DONE` | Da bat `@EnableScheduling`, can thiet de scheduler no-show/pending expire chay that. |
| `parking-backend/src/main/java/com/swp391/parking/entity/ParkingSession.java` | session lifecycle enum | `DONE` | Da loai `EXCEPTION` khoi enum, state machine session chi con 3 trang thai van hanh that. |
| `parking-backend/src/main/java/com/swp391/parking/repository/BookingRepository.java` | booking no-show query | `DONE` | Da doi sang query dua tren `bookingStartTime + 30p`, dung nghiep vu hon `expiredAt`. |
| `parking-backend/src/main/java/com/swp391/parking/scheduler/BookingScheduler.java` | booking expiry scheduler | `DONE` | Da dung query no-show moi, da co test. |
| `parking-backend/src/main/java/com/swp391/parking/service/impl/BookingServiceImpl.java` | cancel window + no-show | `DONE` | Da khoa rule huy booking trong 10 phut sau coc, da cover test. |
| `parking-backend/src/main/java/com/swp391/parking/service/impl/ExceptionCaseServiceImpl.java` | exception lifecycle | `DONE` | Da khoa transition `OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED`. |
| `parking-backend/src/main/java/com/swp391/parking/service/PaymentService.java` | payment lifecycle contract | `DONE` | Da expose them `markFailed()` va `refundPayment()`. |
| `parking-backend/src/main/java/com/swp391/parking/controller/PaymentController.java` | payment actions API | `DONE` | Da co endpoint `/{paymentId}/fail` va `/{paymentId}/refund`. |
| `parking-backend/src/main/java/com/swp391/parking/service/impl/PaymentServiceImpl.java` | failed/refunded business rule | `DONE` | Da implement guard cho `FAILED/REFUNDED`, cho phep recreate deposit sau failed, va validate refund eligibility. |
| `parking-backend/src/main/java/com/swp391/parking/entity/ExceptionCase.java` | exception type taxonomy | `PARTIAL` | Da them type moi, nhung con no quy dinh nghiep vu ro hon cho tung type. |
| `parking-backend/src/test/java/com/swp391/parking/support/AbstractIntegrationTestSupport.java` | test support | `DONE` | Chi bo sung helper/repository/scheduler phuc vu test. |
| `parking-backend/src/test/java/com/swp391/parking/integration/Be3FlowIntegrationTest.java` | regression/integration test | `DONE` | Da co test cho exception close, expiry/no-show, cancel window, walk-in lifecycle, va OCR statuses. |
| `parking-frontend/src/pages/staff/ExceptionCasePage.jsx` | exception UI | `PARTIAL` | Da dung duoc cho `Assign/Resolve/Close`, nhung con mo ho vi DB dang dung chung `resolvedBy` cho assign va resolve. |
| `parking-frontend/src/pages/staff/UnifiedQrScanPage.jsx` | OCR/manual/exception fallback UI | `PARTIAL` | Huong di dung va da noi duoc low-confidence OCR + exception fallback, nhung day la file con no nhieu nhat ve do phuc tap va test/UI cleanup. |
| `DB_STATUS_FLOW_AUDIT.md` | bao cao tong hop | `PARTIAL` | Da cap nhat rollout va matrix, nhung moi dot tiep theo van can cap nhat tiep de giu bao cao final sach. |

### Ghi chu cho 2 file `PARTIAL` quan trong

`UnifiedQrScanPage.jsx`:

- Da co modal review OCR confidence thap ngay tai cong.
- Da chan `PENDING_PAYMENT` booking vao nham nhu `CONFIRMED`.
- Da co fallback tao exception khi flow thuong khong chot duoc.
- Con no:
  - UI rieng neu muon cho staff sua scan da `AUTO_APPROVED`
  - don bot logic trong page de de bao tri hon
  - thong nhat viec co can truyen `staffUserId` o frontend hay khong

`ExceptionCasePage.jsx`:

- Da support `Close` va tach khu `Resolved Gan Day`.
- Con no:
  - neu muon audit dep hon, can tach `assignedTo` khoi `resolvedBy` o backend/model
  - co the them filter/search/sort neu queue exception lon

## 17. Pricing Rollout 2026-06-30

### Muc tieu nghiep vu da chot

- `Grace period`: 10 phut dau mien phi
- Sau grace period, tinh theo `block 30 phut`
- Neu session di qua nhieu khung gio, tach session thanh tung doan va ap dung gia cua tung khung
- Giu cong thuc tong:
  - `total = base_fee + overtime_fee + penalty_fee - discount - deposit_deducted`
  - hien tai `overtime`, `penalty`, `discount` van = `0`

### Muc gia da ap dung vao DB runtime

`MOTORBIKE`

- `WEEKDAY 06:00-22:00`: `5,000 / 30 phut`
- `WEEKDAY 22:00-06:00`: `4,000 / 30 phut`
- `WEEKEND 06:00-22:00`: `6,000 / 30 phut`
- `WEEKEND 22:00-06:00`: `5,000 / 30 phut`

`CAR`

- `WEEKDAY 06:00-22:00`: `15,000 / 30 phut`
- `WEEKDAY 22:00-06:00`: `12,000 / 30 phut`
- `WEEKEND 06:00-22:00`: `20,000 / 30 phut`
- `WEEKEND 22:00-06:00`: `15,000 / 30 phut`

`ELECTRIC_CAR`

- Tam dong bo theo `CAR` de tranh lech khi mo lai loai xe nay.

### Runtime DB da cap nhat

Da update truc tiep `parking_db.pricing_policy`:

- policy `#3`: `3,000 -> 4,000`
- policy `#2`: `7,000 -> 6,000`
- them policy `#11`: `MOTORBIKE / WEEKEND / 22-6 / 5,000`
- policy `#6`: `10,000 -> 12,000`
- them policy `#12`: `CAR / WEEKEND / 22-6 / 15,000`
- policy `#9`: `10,000 -> 12,000`
- them policy `#13`: `ELECTRIC_CAR / WEEKEND / 22-6 / 15,000`

### File code da doi

- `parking-backend/src/main/java/com/swp391/parking/util/FeeCalculatorUtil.java`
  - them `GRACE_PERIOD_MINUTES = 10`
  - them `BILLING_BLOCK_MINUTES = 30`
  - them fee calc moi theo block + split khung gio
- `parking-backend/src/main/java/com/swp391/parking/service/impl/ParkingSessionServiceImpl.java`
  - preview `calculatedFee` cua session dung rule moi
- `parking-backend/src/main/java/com/swp391/parking/service/impl/PaymentServiceImpl.java`
  - `createParkingFee()` tinh `baseFee/totalAmount` theo rule moi
- `parking-backend/src/test/java/com/swp391/parking/util/FeeCalculatorUtilTest.java`
  - test grace period
  - test round-up 30 phut
  - test split khung gio
  - test weekend night
- `parking-backend/src/test/java/com/swp391/parking/integration/Be3FlowIntegrationTest.java`
  - them integration test verify `createParkingFee` tinh `27,000` cho case cat qua khung 22:00
- `parking-frontend/src/pages/driver/CurrentSessionPage.jsx`
  - doi label don gia tu `/h` sang `/30 phut`
- `parking-frontend/src/pages/staff/staffPortalState.js`
  - helper mock/staff local tinh theo grace 10 phut + block 30 phut de khong lech nhan thuc voi backend

### Quy tac tinh phi moi

1. Lay `entryTime`
2. Neu `exitTime <= entryTime + 10 phut`:
   - phi = `0`
3. Neu qua 10 phut:
   - bat dau tinh tu `entryTime + 10 phut`
4. Cat session theo:
   - moc doi khung gia (`06:00`, `22:00`, doi `WEEKDAY/WEEKEND`)
   - va moc ket thuc session
5. Moi doan:
   - lam tron len theo `block 30 phut`
   - nhan voi gia cua policy tai doan do
6. Cong tat ca doan lai thanh `baseFee`

### Vi du tham chieu

- Session: `21:50 -> 22:20`, `CAR`, `WEEKDAY`
- Grace 10 phut:
  - bo qua `21:50 -> 22:00`
- Con lai:
  - `22:00 -> 22:20`
- Thuoc khung `WEEKDAY night = 12,000 / 30 phut`
- Ket qua:
  - `1 block x 12,000 = 12,000`

- Session: `21:35 -> 22:20`, `CAR`, `WEEKDAY`
- Grace 10 phut:
  - bo qua `21:35 -> 21:45`
- Con lai:
  - `21:45 -> 22:00` => `1 block x 15,000`
  - `22:00 -> 22:20` => `1 block x 12,000`
- Ket qua:
  - `27,000`

### Cach test de kiem tra lai

1. Test grace period
   - Tao session vao `09:00`, ra `09:10`
   - Tao parking fee
   - Ky vong `baseFee = 0`, `totalAmount = 0`

2. Test 1 block 30 phut
   - Tao session vao `09:00`, ra `09:25`
   - Sau grace period con `15 phut`
   - Ky vong `1 block`

3. Test 2 block 30 phut
   - Tao session vao `09:00`, ra `09:41`
   - Sau grace period con `31 phut`
   - Ky vong `2 block`

4. Test cat khung ngay -> dem
   - Tao session `21:35 -> 22:20`
   - Ky vong:
     - block truoc 22:00 dung gia ngay
     - block sau 22:00 dung gia dem

5. Test weekend night
   - Tao session vao toi Chu nhat `22:05 -> 22:50`
   - Ky vong dung policy `WEEKEND 22-6`

6. Test deposit tru phi
   - Tao booking co deposit > 0
   - Tao session + parking fee
   - Ky vong:
     - `baseFee` tinh theo rule moi
     - `depositDeducted` tru dung vao `totalAmount`

### Ghi chu

- Truong API `hourlyRate` va `appliedRate` hien dang giu ten cu vi tuong thich FE/DB, nhung trong rollout nay no nen duoc hieu la `muc gia block tham chieu`, khong con la `gia moi gio` theo nghia cu.
- Neu muon sach hon nua o dot sau:
  - doi ten field API sang `blockRate`
  - them `billingModel = BLOCK_30M_WITH_GRACE`
  - viet migration/schema note ro hon cho manager UI

### Ket qua verify rollout

- `mvn.cmd test`: `PASS`
  - `61 tests, 0 failures`
- `cmd /c npm run build`: `PASS`
- Runtime DB `parking_db.pricing_policy`: da verify lai sau update
  - co day du policy `WEEKDAY/WEEKEND` + `DAY/NIGHT`
  - da co them `WEEKEND night` cho `MOTORBIKE`, `CAR`, `ELECTRIC_CAR`
