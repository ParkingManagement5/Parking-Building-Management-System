# Sơ đồ bãi xe & line dẫn đường (Wayfinding) — giải thích code

Tài liệu này giải thích toàn bộ phần code liên quan đến việc **vẽ sơ đồ zone/slot**
và **vẽ line dẫn đường (route) từ cổng vào tới đúng chỗ đã đặt**, đang dùng ở
các portal Driver và Staff.

## 1. Các file liên quan (toàn bộ nằm ở đâu)

| File | Vai trò |
|---|---|
| `src/config/buildingFloorPlans.js` | **Dữ liệu tọa độ tay** (hand-tuned) cho từng tòa nhà thật: hình dạng nhà, tường, làn xe, vị trí cổng, và khung tọa độ `x/y/w/h` của từng zone. Không chứa logic vẽ. |
| `src/pages/driver/ParkingFloorPlan.jsx` | **Toàn bộ logic vẽ SVG** — dựng lưới slot trong 1 zone, vẽ zone, vẽ line dẫn đường, legend, panel chi tiết, nút zoom... Đây là file bạn đang mở. |
| `src/pages/driver/parkingFloorPlanUtils.js` | Hàm tiện ích thuần dữ liệu dùng chung (đọc tên/mã zone-slot, xác định slot nào là "của tôi", tô màu theo trạng thái...). Tách riêng khỏi `.jsx` chỉ để Fast Refresh (HMR) hoạt động đúng — không liên quan tới thuật toán vẽ line. |
| `src/pages/driver/DriverFindParkingPage.jsx` | Nơi **driver xem sơ đồ + line dẫn đường** khi duyệt bãi ("Tìm chỗ đỗ") hoặc xem chỗ mình đã đặt. |
| `src/pages/staff/GatePage.jsx` | Nơi **staff xem "Bản đồ bãi"** (không có line dẫn đường vì `session={null}`, chỉ xem layout + trạng thái slot). |
| `src/pages/public/PublicSlotListPage.jsx` | Trang public xem trước layout (chưa đăng nhập), dùng lại y hệt 2 component trên. |

Tất cả các trang trên đều theo cùng 1 pattern:

```js
import { getFloorPlan } from "../../config/buildingFloorPlans";
import { ParkingMap, StaticFloorPlanMap } from ".../ParkingFloorPlan";

const plan = getFloorPlan(buildingName, floorNumber); // null nếu building/tầng chưa có layout tay
plan
  ? <StaticFloorPlanMap plan={plan} sections={zones} session={mySession} activeZone={...} onSlotClick={...} />
  : <ParkingMap sections={zones} session={mySession} activeZone={...} onSlotClick={...} />
```

→ **`StaticFloorPlanMap`** dùng cho 4 tòa nhà thật đã có tọa độ tay trong
`buildingFloorPlans.js`. **`ParkingMap`** là fallback tự-động-xếp-lưới, dùng khi
một building/tầng nào đó *chưa* có layout tay (hiện tại 4 tòa thật đều đã có
đủ, nên `ParkingMap` chỉ còn là lưới dự phòng).

## 2. `buildingFloorPlans.js` — dữ liệu, không phải logic

Mỗi entry trong `FLOOR_PLANS` (key dạng `"Tên tòa nhà|Số tầng"`) gồm:

- `vbW`, `vbH`: kích thước viewBox SVG của bản vẽ.
- `bg`: màu nền.
- `route: { entryX, entryY, laneY }`: **điểm cổng vào** (entryX/entryY — vị trí
  chấm cam "BẠN VÀO ĐÂY" trên bản vẽ) và **tọa độ Y của làn xe chính**
  (laneY — trục ngang mà xe di chuyển dọc theo trước khi rẽ vào từng zone).
- `decorations`: mảng các hình trang trí thuần túy (tường, làn xe, chữ, cổng...) —
  chỉ để vẽ, không ảnh hưởng logic line.
- `zones`: `[{ match: "T1-A", x, y, w, h }, ...]` — khung hình chữ nhật của
  từng zone trên bản vẽ. `match` dùng để khớp với zone thật từ API (theo tên,
  khớp chính xác hoặc theo tiền tố).

`getFloorPlan(buildingName, floorNumber)` chỉ tra cứu theo key, có fallback
so khớp không dấu/không phân biệt hoa-thường nếu tên building gõ lệch chút.

**Quan trọng:** vì đây là tọa độ tay, thuật toán vẽ line ở `ParkingFloorPlan.jsx`
phải tự suy luận "chỗ nào trống, chỗ nào có zone" dựa trên các hình chữ nhật
này — không có khái niệm "lane"/"corridor" tường minh nào khác ngoài các con số
`x/y/w/h` của từng zone.

## 3. `ParkingFloorPlan.jsx` — các khối chính



### 3.1. Lưới slot trong 1 zone: `computeZoneGrid` + `slotRectAt`

Một zone luôn hiển thị tối đa `ZONE_COLS = 3` cột. `computeZoneGrid(zw, zh, n)`
tính:00
- Số hàng (`nRows`), số cột ở hàng cuối nếu lẻ (`colsInLastRow`).
- Kích thước 1 slot (`slotW`, `slotH`, tỉ lệ cố định 2:1 — `SLOT_ASPECT`).
- Khoảng cách giữa các cột (`colStep`) và giữa các hàng (`rowStep`), gồm
  `ZONE_COL_GAP` (khe giữa 2 cột) và `ZONE_AISLE_GAP` (khe lối đi giữa 2 hàng —
  rộng hơn, mô phỏng lối xe lùi/tiến vào chỗ).
- Căn giữa lưới trong khung zone nếu còn dư không gian.

`slotRectAt(pz, grid, index)` trả về hình chữ nhật chính xác (`x,y,w,h`) của
1 slot cụ thể theo `index` trong danh sách slot đã sort, kèm `ri` (row index)
và `ci` (column index) — 2 giá trị này là **chìa khóa** để thuật toán route biết
slot đang ở hàng nào/cột nào trong zone.

### 3.2. Line dẫn đường trong `StaticFloorPlanMap` (bản vẽ tay, 4 tòa thật)

Đây là phần vừa sửa nhiều lần gần đây. Toàn bộ nằm trong 1 khối IIFE
`{route && activeBox && (() => { ... })()}` ở `ParkingFloorPlan.jsx`.

Line được dựng như một chuỗi lệnh SVG path (`M`/`L`) đi qua 3 chặng:

**Chặng 1 — `computeEntryPrefix(route, planZones)`: từ cổng vào tới làn xe chính.**
Bình thường chỉ là 1 đường thẳng đứng từ điểm cổng (`entryX,entryY`) tới `laneY`.
Nhưng một số tòa (Lê Văn Tám, Tân Sơn Nhất) có cổng nằm thẳng hàng với 1 zone
nằm giữa cổng và làn xe → hàm này kiểm tra trước, nếu phát hiện có zone chắn
ngang đoạn thẳng đó thì rẽ sang khe hở gần nhất (trái/phải zone đó) trước khi
đi tiếp, tránh cắt xuyên qua khối zone.

**Chặng 2 — từ làn xe chính rẽ vào đúng zone/slot**, chia 2 trường hợp dựa vào
`ri` (hàng) của slot đích:

- **Hàng ngoài** (`isOuterRow`, hàng slot nằm sát làn xe chính): đi thẳng từ
  làn xe rẽ vào luôn, không cần vòng qua cột nào.
- **Hàng trong** (hàng phía sau, xa làn xe hơn): phải đi qua 1 "corridor" X
  (khe dọc luôn trống xuyên suốt) để không cắt qua slot ở hàng ngoài, rồi mới
  rẽ ngang vào đúng cột:
  - Slot ở **cột ngoài cùng trái/phải** (`ci === 0` hoặc `ci === lastCi`): dùng
    khe hở **ngoài cùng của cả zone** (`activeBox.x - ZONE_EDGE_GAP` hoặc
    `activeBox.x + activeBox.w + ZONE_EDGE_GAP` — tức khe giữa zone này và
    zone/tường bên cạnh), không dùng khe nội bộ giữa cột 1-2 để tránh nhìn như
    cắt qua ô bên cạnh.
  - Slot ở **cột giữa** (`ci === 1`): đi sâu vào khe nội bộ giữa cột giữa và
    cột kế bên (`colGapWidth/2`).
  - Sau khi vào đúng corridor X, line rẽ ngang tại **giữa khe aisle**
    (`aisleMidY`, điểm giữa `ZONE_AISLE_GAP`) chứ không rẽ sát mép hàng ngoài
    — mô phỏng xe "tiến vào giữa lối đi rồi mới rẽ vào cho", tự nhiên hơn.

Cuối cùng line luôn dừng đúng tại **cạnh ngoài của slot đích** (`nearEdgeY`
— cạnh trên nếu vào từ trên, cạnh dưới nếu vào từ dưới), không chạy đè lên
chữ/viền bên trong slot.

`ZONE_EDGE_GAP = 5` được chọn dựa trên khảo sát thủ công khe hở nhỏ nhất giữa
2 zone cạnh nhau trên cả 4 bản vẽ thật (nhỏ nhất là 10px ở Tân Sơn Nhất khu
B-C) — dùng 5px (nửa khe) để line luôn nằm giữa, không bao giờ chạm sang zone
bên cạnh dù bản vẽ nào.

### 3.2.1. Ví dụ chạy từng bước — không phải pathfinding tổng quát

**Lưu ý quan trọng trước tiên:** đây **không phải** thuật toán tìm đường tổng
quát kiểu A*/Dijkstra (không có "đồ thị", không có "node", không tự khám phá
đường đi). Vì bản đồ là **hand-tuned cố định** (mục 2), lập trình viên đã biết
trước chính xác "lane nằm ở đâu, corridor nằm ở đâu" — nên thuật toán chỉ là
1 chuỗi **quy tắc if/else cứng** dựa trên các con số đã tính sẵn (`ri`, `ci`,
`aisleGap`...), không cần dò/khám phá gì cả. Đây là lý do nó rất nhanh và dễ
đoán, nhưng cũng là lý do nó **không tự động đúng** nếu ai đó vẽ tay 1 bản đồ
mới có bố cục khác hẳn (vd lane nằm dọc thay vì ngang) — thuật toán sẽ phải
sửa tay theo.

Ví dụ đầy đủ: driver đặt slot **T1-E-05** ở **Bãi xe Tân Sơn Nhất, tầng 1**
(`route: { entryX: 545, entryY: 555, laneY: 340 }`, zone T1-E ở
`x:420,y:375,w:225,h:165`).

**Bước 1 — `computeEntryPrefix`:** cổng (545,555) nằm thẳng cột với zone E
(420→645) → bị chặn. Đường đi: lên `y=545` (mép dưới zone E, +5 gap) → rẽ
phải sang `x=650` (khe hở bên phải zone E, gần zone F hơn nên chọn phải thay
vì trái) → đi thẳng lên `laneY=340`.

**Bước 2 — xác định `ri`/`ci` của slot đích:** `computeZoneGrid` cho zone E
(6 slot) ra `aisleGap=11.92`, `colStep=42.79`. Slot `E-05` là index 4 → `ri=1`
(hàng dưới/trong), `ci=1` (cột giữa).

**Bước 3 — hàng trong + cột giữa** (nhánh `else` → nhánh `ci giữa`,
`ParkingFloorPlan.jsx:385-388`): vì `ri=1` là hàng trong (`isOuterRow=false`)
và `ci=1` là cột giữa (không phải `0` hay `lastCi`) → dùng khe nội bộ:
`corridorX = 553.9` (giữa cột E-05 và E-06).

**Bước 4 — nối các đoạn** (dòng 395): từ lane (`x=650,y=340`) đi ngang trái
tới `corridorX=553.9` → đi dọc xuống `aisleMidY=457.5` (đúng giữa khe hở 2
hàng của zone) → đi ngang tới `slotCenterX=532.5` (tâm cột của E-05, vẫn đang
ở trong khe aisle, chưa chạm slot nào) → đoạn cuối cùng đi xuống `nearEdgeY=
463.46` (mép trên của slot E-05) và dừng lại.

Toàn bộ path SVG cuối cùng (`d`):
```
M545 555 L545 545 L650 545 L650 340
L553.9 340 L553.9 457.5 L532.5 457.5 L532.5 463.46
```
6 đoạn thẳng, không đoạn nào cắt qua bất kỳ hình chữ nhật zone nào — vì mỗi
điểm rẽ đều được chọn nằm trong 1 "khe hở đã biết trước" (khe ngoài cổng, khe
cột, khe aisle) chứ không phải tính bằng cách dò tìm.

### 3.3. Line dẫn đường trong `ParkingMap` (lưới tự động, fallback)

`ParkingMap` không có tọa độ tay — nó tự xếp các zone thành lưới `COLS = 3` cột
đều nhau. Line dẫn đường ở đây đơn giản hơn (chỉ xử lý zone đích ở hàng đầu hay
hàng sau trong lưới zone-của-zone, không có khái niệm cột ngoài/cột giữa như
`StaticFloorPlanMap`):
- Zone đích ở hàng đầu (`azRow === 0`): đi thẳng từ cổng xuống.
- Zone đích ở hàng sau: đi qua khe giữa các cột zone (`corridorOnRight`/
  `corridorX`) rồi rẽ vào đúng zone/slot.

Vì hiện tại cả 4 tòa thật đều đã có layout tay đầy đủ, `ParkingMap` gần như
không còn được dùng trong thực tế — chỉ còn là lớp bảo vệ nếu sau này thêm
tòa/tầng mới mà chưa kịp vẽ tay tọa độ.

### 3.4. Các phần còn lại

- `ZoneCell`: vẽ 1 zone (khung + các slot bên trong + vạch lối đi giữa các hàng).
- `Slot`: vẽ 1 ô slot (bo góc, màu theo trạng thái, hiệu ứng nhấp nháy nếu là
  slot "của tôi").
- `Legend`: chú giải màu/line góc dưới trái bản vẽ.
- `DetailPanel`: panel chi tiết bên phải khi click chọn 1 slot (trạng thái,
  loại xe, hướng dẫn từng bước nếu là slot của mình).
- `FloorTabs`, `ZoomCtrl`: điều khiển UI (chọn tầng, zoom) — không liên quan
  thuật toán route.

## 4. Bố cục tọa độ được tính như thế nào (2 tầng tọa độ, ví dụ số cụ thể)

Toàn bộ bản vẽ dùng **2 tầng tọa độ độc lập**, không liên quan gì đến nhau về
cách tạo ra:

1. **Tầng zone** (trong `buildingFloorPlans.js`): tọa độ **gõ tay**, cố định,
   không bao giờ tính toán lại.
2. **Tầng slot** (trong `computeZoneGrid`/`slotRectAt`): tọa độ **tính tự động
   từ code**, luôn suy ra lại mỗi lần render — không lưu ở đâu cả.

### Tầng 1 — khung zone (tay, tĩnh)

Mỗi building/tầng có 1 hệ trục SVG riêng, kích thước `vbW × vbH` (vd FPT HCM:
`1000 × 600`). Trong hệ trục đó, mỗi zone chỉ là **1 hình chữ nhật gõ tay**:

```js
{ match: "T1-A", x: 60, y: 76, w: 250, h: 204 }
```

Người vẽ (dev) tự chọn 4 số này sao cho khớp với hình dạng thật của building
(tránh đè lên tường/làn xe/zone khác — xem `decorations` cùng file). Đây là
**số duy nhất không có công thức** — hoàn toàn do mắt/tay canh chỉnh, giống
như vẽ CAD thủ công.

### Tầng 2 — lưới slot bên trong zone (tự động, có công thức)

Một khi đã có khung zone `(x, y, w, h)`, **vị trí từng slot bên trong không
gõ tay nữa** — `computeZoneGrid(zw, zh, n)` tự chia lưới tối đa 3 cột
(`ZONE_COLS`). Ví dụ zone `T1-A` ở trên (`w=250, h=204`, 6 slot):

```
availW = 250 − 2×6(pad)        = 238
availH = 204 − 8 − 8(pad)      = 188

colGap  = clamp(4, min(18, 238×4%))  = 9.52   // khe giữa 2 cột
aisleGap= clamp(4, min(30, 188×8%))  = 15.04  // khe giữa 2 hàng (rộng hơn colGap)

nRows = ceil(6/3) = 2 hàng đủ (không hàng nào thiếu)

// slot phải vừa CẢ chiều rộng lẫn chiều cao, và luôn giữ tỉ lệ 2:1 (cao gấp đôi rộng):
maxW-theo-chiều-rộng = (238 − 2×9.52) / 3   = 72.99
maxW-theo-chiều-cao  = (188 − 15.04) / 2 / 2 = 43.24   ← nhỏ hơn, nên THẮNG

slotW = 43.24     slotH = slotW×2 = 86.48
colStep = 43.24 + 9.52  = 52.76   (bước nhảy giữa tâm 2 cột)
rowStep = 86.48 + 15.04 = 101.52  (bước nhảy giữa tâm 2 hàng)

// luới 3 cột × 2 hàng chỉ chiếm 148.76 × 188 trong khung 238 × 188 sẵn có
// → dư bề ngang, CĂN GIỮA:
offsetX = (238 − 148.76) / 2 = 44.62
offsetY = (188 − 188) / 2    = 0   (vừa khít chiều cao, không dư)
```

Vì sao `slotW` bị chiều cao quyết định (43.24) chứ không phải chiều rộng
(72.99)? Vì slot buộc tỉ lệ dọc 2:1 (`SLOT_ASPECT`) — nếu render theo bề rộng
tối đa (72.99) thì chiều cao sẽ phải là 145.98, vượt quá `maxHByHeight`
(86.48) → tràn khung zone theo chiều dọc. Nên code luôn lấy **giá trị nhỏ
hơn** trong 2 cách tính để đảm bảo không tràn theo bất kỳ chiều nào.

Từ đó, `slotRectAt(pz, grid, index)` suy ra tọa độ tuyệt đối của **từng ô**
theo công thức `pz.x/y + padding + offset + (ri, ci)×step`. Vd slot đầu tiên
(`T1-A-01`, `index=0` → hàng 0 cột 0):

```
x = 60(pz.x) + 6(pad) + 44.62(offsetX) + 0×52.76 = 110.62
y = 76(pz.y) + 8(pad) + 0(offsetY)     + 0×101.52 = 84
w = 43.24   h = 86.48
```

Và `T1-A-04` (hàng 1 cột 0 — ngay dưới `T1-A-01`, cách nhau đúng `aisleGap`):

```
x = 110.62   (cùng cột nên x giống hệt T1-A-01)
y = 76 + 8 + 0 + 1×101.52 = 185.52
```

### Vì sao tách 2 tầng như vậy?

- Zone hiếm khi đổi hình dạng (building thật không thay đổi kết cấu) → gõ tay
  1 lần là đủ, không cần thuật toán auto-layout phức tạp cho toàn bộ mặt bằng.
- Số slot trong 1 zone **có thể đổi** (thêm/bớt slot qua Manager) → phần này
  bắt buộc phải tính tự động mỗi lần render, không thể gõ tay tọa độ từng slot
  (sẽ vỡ ngay khi số slot thay đổi). `computeZoneGrid`/`slotRectAt` chính là
  lớp "tự thích nghi" đó — nhận đầu vào là khung zone tĩnh + số lượng slot
  động, xuất ra tọa độ chính xác mà không ai phải sửa tay khi dữ liệu đổi.
- Cùng bộ số (`colGap`, `aisleGap`, `colStep`, `ri`, `ci`) còn được thuật toán
  **line dẫn đường** (mục 3.2) tái sử dụng để tìm "khe trống" giữa các slot —
  nên khung zone tay + lưới slot tự động là nền tảng cho *toàn bộ* phần hiển
  thị, không chỉ riêng việc vẽ ô.

## 5. Tóm tắt luồng dữ liệu

```
API (buildings/floors/zones/slots)
        │
        ▼
DriverFindParkingPage.jsx / GatePage.jsx / PublicSlotListPage.jsx
        │  gọi getFloorPlan(buildingName, floorNumber)
        ▼
buildingFloorPlans.js  ──(có layout tay?)──► StaticFloorPlanMap (ParkingFloorPlan.jsx)
        │                                         │ dùng route + planZones (tọa độ tay)
        └──(không có)──► ParkingMap (ParkingFloorPlan.jsx)
                                                    │ tự xếp lưới, không cần tọa độ tay
                                                    ▼
                                    SVG: ZoneCell + Slot + line dẫn đường (nếu có session/activeZone)
```
