/**
 * Static floor plan layouts per building + floor.
 * Key format: "BUILDING_NAME|FLOOR_NUMBER"
 * Zone match: by zone name (exact or prefix).
 * Mỗi building có biên dạng (path) riêng bám theo địa chỉ thật, nhưng LUÔN
 * giữ đủ 6 zone thật (T{n}-A..F) như DataInitializer seed — chỉ đổi hình
 * dáng/toạ độ hiển thị, không giảm số khu vực so với dữ liệu DB.
 */

const ROAD_FILL = "#c8d6e5";
const WALL_FILL = "#94a3b8";
const WATER_FILL = "#bcd4de";
const PARK_FILL = "#cfe0c4";

export const FLOOR_PLANS = {
  /* ────────────────────────────────────────────────
     Bãi xe FPT HCM – lô góc vát (chamfer) tại giao lộ
     D1/D2, khu công nghệ Long Thạnh Mỹ, Thủ Đức.
  ──────────────────────────────────────────────── */
  "Bãi xe FPT HCM|1": {
    vbW: 1000, vbH: 600,
    bg: "#dde8f5",
    route: { entryX: 915, entryY: 74, laneY: 325 },
    decorations: [
      { type: "path", d: "M40,40 L900,40 L940,80 L940,560 L40,560 Z", fill: "#eef2f8", stroke: WALL_FILL, sw: 3 },
      { type: "lane", x: 60, y: 290, w: 850, h: 70, fill: ROAD_FILL, label: "LỐI ĐI CHÍNH" },
      { type: "rect", x: 895, y: 48, w: 40, h: 22, rx: 3, fill: "#22c55e" },
      { type: "text", x: 915, y: 60, text: "CỔNG", fontSize: 7.5, fill: "#fff", anchor: "middle" },
      { type: "text", x: 470, y: 30, text: "↓ ĐƯỜNG D1", fontSize: 9, fill: "#64748b", anchor: "middle" },
      { type: "rect", x: 320, y: 76, w: 8, h: 204, fill: WALL_FILL },
      { type: "rect", x: 596, y: 76, w: 8, h: 204, fill: WALL_FILL },
      { type: "rect", x: 320, y: 364, w: 8, h: 170, fill: WALL_FILL },
      { type: "rect", x: 596, y: 364, w: 8, h: 170, fill: WALL_FILL },
    ],
    zones: [
      { match: "T1-A", x: 60, y: 76, w: 250, h: 204 },
      { match: "T1-B", x: 336, y: 76, w: 252, h: 204 },
      { match: "T1-C", x: 612, y: 76, w: 248, h: 204 },
      { match: "T1-D", x: 60, y: 364, w: 250, h: 170 },
      { match: "T1-E", x: 336, y: 364, w: 252, h: 170 },
      { match: "T1-F", x: 612, y: 364, w: 248, h: 170 },
    ],
  },

  /* Tầng 2 — chỉ tiếp cận qua ramp cùng vị trí góc vát. */
  "Bãi xe FPT HCM|2": {
    vbW: 1000, vbH: 600,
    bg: "#f0ece8",
    route: { entryX: 915, entryY: 74, laneY: 325 },
    decorations: [
      { type: "path", d: "M40,40 L900,40 L940,80 L940,560 L40,560 Z", fill: "#f7f4f0", stroke: "#a89d92", sw: 3 },
      { type: "lane", x: 60, y: 290, w: 850, h: 70, fill: "#c4b9ae", label: "LỐI ĐI CHÍNH" },
      { type: "rect", x: 895, y: 48, w: 40, h: 22, rx: 3, fill: "#0ea5e9" },
      { type: "text", x: 915, y: 60, text: "RAMP", fontSize: 7, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 320, y: 76, w: 8, h: 204, fill: "#9ca3af" },
      { type: "rect", x: 596, y: 76, w: 8, h: 204, fill: "#9ca3af" },
      { type: "rect", x: 320, y: 364, w: 8, h: 170, fill: "#9ca3af" },
      { type: "rect", x: 596, y: 364, w: 8, h: 170, fill: "#9ca3af" },
    ],
    zones: [
      { match: "T2-A", x: 60, y: 76, w: 250, h: 204 },
      { match: "T2-B", x: 336, y: 76, w: 252, h: 204 },
      { match: "T2-C", x: 612, y: 76, w: 248, h: 204 },
      { match: "T2-D", x: 60, y: 364, w: 250, h: 170 },
      { match: "T2-E", x: 336, y: 364, w: 252, h: 170 },
      { match: "T2-F", x: 612, y: 364, w: 248, h: 170 },
    ],
  },

  /* ────────────────────────────────────────────────
     pink pi – Tầng 1 (2 xe máy top + 2 ô tô bottom)
  ──────────────────────────────────────────────── */
  "pink pi|1": {
    vbW: 900, vbH: 520,
    bg: "#fdf0f5",
    route: { entryX: 62, entryY: 38, laneY: 262 },
    decorations: [
      { type: "rect", x: 4, y: 4, w: 892, h: 512, rx: 10, fill: "#f0c8dc", stroke: "#d48aac", sw: 1.5 },
      { type: "rect", x: 12, y: 12, w: 876, h: 496, rx: 8, fill: "#fef5f9", stroke: "#e8b0cc", sw: 0.8 },
      // Road lane between xe máy and ô tô rows
      { type: "lane", x: 12, y: 242, w: 876, h: 40, fill: "#e8b0cc" },
      // Divider lane between left/right zones
      { type: "lane", x: 444, y: 44, w: 12, h: 190, dir: "v", fill: "#e8b0cc", arrows: false },
      { type: "lane", x: 444, y: 290, w: 12, h: 200, dir: "v", fill: "#e8b0cc", arrows: false },
      // Entry gate (left top)
      { type: "rect", x: 12, y: 12, w: 100, h: 26, rx: 4, fill: "#22c55e" },
      { type: "text", x: 62, y: 25, text: "▶ CỔNG VÀO", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Exit gate (right top)
      { type: "rect", x: 788, y: 12, w: 100, h: 26, rx: 4, fill: "#ef4444" },
      { type: "text", x: 838, y: 25, text: "CỔNG RA ◀", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Both gate (bottom-center)
      { type: "rect", x: 350, y: 486, w: 200, h: 26, rx: 4, fill: "#8b5cf6" },
      { type: "text", x: 450, y: 499, text: "↕ CỔNG VÀO / RA", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Zone type labels
      { type: "rect", x: 20, y: 44, w: 80, h: 18, rx: 3, fill: "#16a34a" },
      { type: "text", x: 60, y: 53, text: "XE MÁY", fontSize: 7.5, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 462, y: 44, w: 80, h: 18, rx: 3, fill: "#16a34a" },
      { type: "text", x: 502, y: 53, text: "XE MÁY", fontSize: 7.5, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 20, y: 290, w: 60, h: 18, rx: 3, fill: "#2563eb" },
      { type: "text", x: 50, y: 299, text: "Ô TÔ", fontSize: 7.5, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 462, y: 290, w: 60, h: 18, rx: 3, fill: "#2563eb" },
      { type: "text", x: 492, y: 299, text: "Ô TÔ", fontSize: 7.5, fill: "#fff", anchor: "middle" },
    ],
    zones: [
      { match: "B2-XM-A", x: 20, y: 44, w: 416, h: 190 },
      { match: "B2-XM-B", x: 464, y: 44, w: 416, h: 190 },
      { match: "B2-OT-A", x: 20, y: 290, w: 416, h: 200 },
      { match: "B2-OT-B", x: 464, y: 290, w: 416, h: 200 },
    ],
  },

  /* ────────────────────────────────────────────────
     Bãi xe Bến Bạch Đằng – dải hẹp uốn theo bờ sông
     Sài Gòn, mặt tiền Tôn Đức Thắng. 1 hàng zone dọc
     theo chiều dài (đặc trưng lô đất ven sông).
  ──────────────────────────────────────────────── */
  "Bãi xe Bến Bạch Đằng|1": {
    vbW: 1300, vbH: 540,
    bg: "#e4ecf7",
    route: { entryX: 135, entryY: 432, laneY: 399 },
    decorations: [
      // Sông Sài Gòn phía trên
      { type: "path", d: "M20,20 Q650,-20 1280,30 L1280,100 Q650,60 20,110 Z", fill: WATER_FILL },
      { type: "text", x: 650, y: 62, text: "SÔNG SÀI GÒN", fontSize: 9, fill: "#3b6b7d", anchor: "middle" },
      // Khối nhà uốn nhẹ theo bờ sông — cao hơn hẳn để 4 ô/khu không bị tràn
      { type: "path", d: "M60,120 Q650,90 1240,130 L1240,460 Q650,495 60,460 Z", fill: "#eef2f8", stroke: WALL_FILL, sw: 3 },
      { type: "lane", x: 80, y: 378, w: 1130, h: 42, fill: ROAD_FILL, label: "LỐI ĐI DỌC MẶT TIỀN" },
      { type: "rect", x: 90, y: 432, w: 90, h: 24, rx: 4, fill: "#22c55e" },
      { type: "text", x: 135, y: 444, text: "▶ VÀO", fontSize: 8, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 1120, y: 432, w: 90, h: 24, rx: 4, fill: "#ef4444" },
      { type: "text", x: 1165, y: 444, text: "RA ◀", fontSize: 8, fill: "#fff", anchor: "middle" },
      { type: "text", x: 650, y: 480, text: "↓ MẶT TIỀN TÔN ĐỨC THẮNG", fontSize: 9.5, fill: "#64748b", anchor: "middle" },
    ],
    zones: [
      { match: "T1-A", x: 90, y: 140, w: 175, h: 230 },
      { match: "T1-B", x: 279, y: 140, w: 175, h: 230 },
      { match: "T1-C", x: 468, y: 140, w: 175, h: 230 },
      { match: "T1-D", x: 657, y: 140, w: 175, h: 230 },
      { match: "T1-E", x: 846, y: 140, w: 175, h: 230 },
      { match: "T1-F", x: 1035, y: 140, w: 175, h: 230 },
    ],
  },

  /* Tầng 2 — chỉ tiếp cận qua ramp, cùng khối nhà ven sông. */
  "Bãi xe Bến Bạch Đằng|2": {
    vbW: 1300, vbH: 540,
    bg: "#f0ece8",
    route: { entryX: 650, entryY: 432, laneY: 399 },
    decorations: [
      { type: "path", d: "M60,120 Q650,90 1240,130 L1240,460 Q650,495 60,460 Z", fill: "#f7f4f0", stroke: "#a89d92", sw: 3 },
      { type: "lane", x: 80, y: 378, w: 1130, h: 42, fill: "#c4b9ae", label: "LỐI ĐI DỌC MẶT TIỀN" },
      { type: "rect", x: 605, y: 432, w: 90, h: 24, rx: 4, fill: "#0ea5e9" },
      { type: "text", x: 650, y: 444, text: "RAMP", fontSize: 8, fill: "#fff", anchor: "middle" },
    ],
    zones: [
      { match: "T2-A", x: 90, y: 140, w: 175, h: 230 },
      { match: "T2-B", x: 279, y: 140, w: 175, h: 230 },
      { match: "T2-C", x: 468, y: 140, w: 175, h: 230 },
      { match: "T2-D", x: 657, y: 140, w: 175, h: 230 },
      { match: "T2-E", x: 846, y: 140, w: 175, h: 230 },
      { match: "T2-F", x: 1035, y: 140, w: 175, h: 230 },
    ],
  },

  /* ────────────────────────────────────────────────
     Bãi xe Lê Văn Tám – biên trái cong theo ranh công
     viên Lê Văn Tám, mặt tiền Hai Bà Trưng.
  ──────────────────────────────────────────────── */
  "Bãi xe Lê Văn Tám|1": {
    vbW: 1000, vbH: 600,
    bg: "#eef7ec",
    route: { entryX: 265, entryY: 86, laneY: 305 },
    decorations: [
      { type: "path", d: "M20,20 Q110,300 20,580 L80,580 Q15,300 80,20 Z", fill: PARK_FILL },
      { type: "text", x: 45, y: 300, text: "CÔNG VIÊN LÊ VĂN TÁM", fontSize: 8.5, fill: "#4d7a4d", anchor: "middle", },
      { type: "path", d: "M180,60 L820,60 L820,540 L180,540 Q100,540 95,460 Q88,300 95,140 Q100,60 180,60 Z", fill: "#f4faf2", stroke: "#8ab38a", sw: 3 },
      { type: "lane", x: 100, y: 275, w: 700, h: 60, fill: "#c8ddc8", label: "LỐI ĐI CHÍNH" },
      { type: "rect", x: 200, y: 64, w: 130, h: 22, rx: 4, fill: "#22c55e" },
      { type: "text", x: 265, y: 76, text: "VÀO (P.CÔNG VIÊN)", fontSize: 7, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 690, y: 64, w: 130, h: 22, rx: 4, fill: "#ef4444" },
      { type: "text", x: 755, y: 76, text: "RA (P.HAI BÀ TRƯNG)", fontSize: 7, fill: "#fff", anchor: "middle" },
      { type: "text", x: 500, y: 578, text: "↓ ĐƯỜNG HAI BÀ TRƯNG", fontSize: 9.5, fill: "#5b7a5b", anchor: "middle" },
    ],
    zones: [
      { match: "T1-A", x: 200, y: 90, w: 190, h: 185 },
      { match: "T1-B", x: 410, y: 90, w: 190, h: 185 },
      { match: "T1-C", x: 620, y: 90, w: 190, h: 185 },
      { match: "T1-D", x: 200, y: 335, w: 190, h: 185 },
      { match: "T1-E", x: 410, y: 335, w: 190, h: 185 },
      { match: "T1-F", x: 620, y: 335, w: 190, h: 185 },
    ],
  },

  /* Tầng 2 — chỉ tiếp cận qua ramp, cùng biên cong công viên. */
  "Bãi xe Lê Văn Tám|2": {
    vbW: 1000, vbH: 600,
    bg: "#f0ece8",
    route: { entryX: 465, entryY: 86, laneY: 305 },
    decorations: [
      { type: "path", d: "M180,60 L820,60 L820,540 L180,540 Q100,540 95,460 Q88,300 95,140 Q100,60 180,60 Z", fill: "#f7f4f0", stroke: "#a89d92", sw: 3 },
      { type: "lane", x: 100, y: 275, w: 700, h: 60, fill: "#c4b9ae", label: "LỐI ĐI CHÍNH" },
      { type: "rect", x: 400, y: 64, w: 130, h: 22, rx: 4, fill: "#0ea5e9" },
      { type: "text", x: 465, y: 76, text: "RAMP", fontSize: 8, fill: "#fff", anchor: "middle" },
    ],
    zones: [
      { match: "T2-A", x: 200, y: 90, w: 190, h: 185 },
      { match: "T2-B", x: 410, y: 90, w: 190, h: 185 },
      { match: "T2-C", x: 620, y: 90, w: 190, h: 185 },
      { match: "T2-D", x: 200, y: 335, w: 190, h: 185 },
      { match: "T2-E", x: 410, y: 335, w: 190, h: 185 },
      { match: "T2-F", x: 620, y: 335, w: 190, h: 185 },
    ],
  },

  /* ────────────────────────────────────────────────
     Bãi xe Tân Sơn Nhất – mặt tiền cong kiểu làn đón/
     trả khách sân bay, Trường Sơn, Tân Bình.
  ──────────────────────────────────────────────── */
  "Bãi xe Tân Sơn Nhất|1": {
    vbW: 1100, vbH: 650,
    bg: "#eef2fb",
    route: { entryX: 545, entryY: 555, laneY: 340 },
    decorations: [
      { type: "path", d: "M150,80 L900,80 L960,560 Q525,610 100,560 Z", fill: "#f3f6fc", stroke: WALL_FILL, sw: 3 },
      { type: "lane", x: 170, y: 305, w: 710, h: 70, fill: ROAD_FILL, label: "LỐI ĐI CHÍNH" },
      { type: "path", d: "M100,560 Q525,610 960,560", fill: "none", stroke: "#94a3b8", sw: 1, dash: "4 6", opacity: 0.7 },
      { type: "text", x: 525, y: 535, text: "LÀN ĐÓN/TRẢ KHÁCH (CONG)", fontSize: 8.5, fill: "#64748b", anchor: "middle" },
      { type: "rect", x: 490, y: 553, w: 110, h: 24, rx: 4, fill: "#22c55e" },
      { type: "text", x: 545, y: 565, text: "CỔNG VÀO CHÍNH", fontSize: 7.5, fill: "#fff", anchor: "middle" },
      { type: "text", x: 525, y: 55, text: "↑ ĐƯỜNG TRƯỜNG SƠN — SÂN BAY", fontSize: 9.5, fill: "#64748b", anchor: "middle" },
    ],
    zones: [
      { match: "T1-A", x: 170, y: 115, w: 225, h: 190 },
      { match: "T1-B", x: 420, y: 115, w: 225, h: 190 },
      { match: "T1-C", x: 655, y: 115, w: 225, h: 190 },
      { match: "T1-D", x: 170, y: 375, w: 225, h: 165 },
      { match: "T1-E", x: 420, y: 375, w: 225, h: 165 },
      { match: "T1-F", x: 655, y: 375, w: 225, h: 165 },
    ],
  },

  /* Tầng 2 — chỉ tiếp cận qua ramp, cùng mặt tiền cong. */
  "Bãi xe Tân Sơn Nhất|2": {
    vbW: 1100, vbH: 650,
    bg: "#f0ece8",
    route: { entryX: 545, entryY: 555, laneY: 340 },
    decorations: [
      { type: "path", d: "M150,80 L900,80 L960,560 Q525,610 100,560 Z", fill: "#f7f4f0", stroke: "#a89d92", sw: 3 },
      { type: "lane", x: 170, y: 305, w: 710, h: 70, fill: "#c4b9ae", label: "LỐI ĐI CHÍNH" },
      { type: "rect", x: 490, y: 553, w: 110, h: 24, rx: 4, fill: "#0ea5e9" },
      { type: "text", x: 545, y: 565, text: "RAMP", fontSize: 8, fill: "#fff", anchor: "middle" },
    ],
    zones: [
      { match: "T2-A", x: 170, y: 115, w: 225, h: 190 },
      { match: "T2-B", x: 420, y: 115, w: 225, h: 190 },
      { match: "T2-C", x: 655, y: 115, w: 225, h: 190 },
      { match: "T2-D", x: 170, y: 375, w: 225, h: 165 },
      { match: "T2-E", x: 420, y: 375, w: 225, h: 165 },
      { match: "T2-F", x: 655, y: 375, w: 225, h: 165 },
    ],
  },
};

/**
 * Look up the floor plan for a given building name + floor number.
 * Returns the plan config or null if no static layout is defined.
 */
export function getFloorPlan(buildingName, floorNumber) {
  const key = `${buildingName}|${floorNumber}`;
  if (FLOOR_PLANS[key]) {
    return FLOOR_PLANS[key];
  }

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9|]+/g, " ")
      .trim()
      .toLowerCase();

  const normalizedTarget = normalize(key);
  const matched = Object.entries(FLOOR_PLANS).find(([planKey]) => normalize(planKey) === normalizedTarget);
  return matched?.[1] || null;
}
