/**
 * Static floor plan layouts per building + floor.
 * Key format: "BUILDING_NAME|FLOOR_NUMBER"
 * Zone match: by zone name (exact or prefix).
 * viewBox 900x520 canvas.
 */

const ROAD_FILL = "#c8d6e5";
const WALL_FILL = "#94a3b8";

export const FLOOR_PLANS = {
  /* ────────────────────────────────────────────────
     Bãi xe FPT HCM – Tầng 1 (Xe máy, 6 zones)
  ──────────────────────────────────────────────── */
  "Bãi xe FPT HCM|1": {
    vbW: 900, vbH: 520,
    bg: "#dde8f5",
    decorations: [
      // Outer wall
      { type: "rect", x: 4, y: 4, w: 892, h: 512, rx: 10, fill: "#c8d6e5", stroke: WALL_FILL, sw: 1.5 },
      // Inner floor
      { type: "rect", x: 12, y: 12, w: 876, h: 496, rx: 8, fill: "#eef2f8", stroke: "#b8c9de", sw: 0.8 },
      // Driving lane row 1→2
      { type: "rect", x: 12, y: 240, w: 876, h: 42, rx: 0, fill: ROAD_FILL },
      { type: "text", x: 450, y: 261, text: "← DRIVING LANE →", fontSize: 9, fill: "#64748b", anchor: "middle" },
      // Entry gate (top-left)
      { type: "rect", x: 12, y: 12, w: 90, h: 26, rx: 4, fill: "#22c55e" },
      { type: "text", x: 57, y: 25, text: "▶ CỔNG VÀO", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Exit gate (top-right)
      { type: "rect", x: 798, y: 12, w: 90, h: 26, rx: 4, fill: "#ef4444" },
      { type: "text", x: 843, y: 25, text: "CỔNG RA ◀", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Both gate (bottom-center)
      { type: "rect", x: 380, y: 486, w: 140, h: 26, rx: 4, fill: "#8b5cf6" },
      { type: "text", x: 450, y: 499, text: "↕ VÀO / RA", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Pillars
      { type: "rect", x: 296, y: 44, w: 10, h: 196, rx: 2, fill: "#94a3b8" },
      { type: "rect", x: 596, y: 44, w: 10, h: 196, rx: 2, fill: "#94a3b8" },
      { type: "rect", x: 296, y: 284, w: 10, h: 196, rx: 2, fill: "#94a3b8" },
      { type: "rect", x: 596, y: 284, w: 10, h: 196, rx: 2, fill: "#94a3b8" },
    ],
    zones: [
      { match: "T1-A", x: 22, y: 44, w: 264, h: 188 },
      { match: "T1-B", x: 315, y: 44, w: 270, h: 188 },
      { match: "T1-C", x: 615, y: 44, w: 273, h: 188 },
      { match: "T1-D", x: 22, y: 288, w: 264, h: 200 },
      { match: "T1-E", x: 315, y: 288, w: 270, h: 200 },
      { match: "T1-F", x: 615, y: 288, w: 273, h: 200 },
    ],
  },

  /* ────────────────────────────────────────────────
     Bãi xe FPT HCM – Tầng 2 (Ô tô, 6 zones)
  ──────────────────────────────────────────────── */
  "Bãi xe FPT HCM|2": {
    vbW: 900, vbH: 520,
    bg: "#f0ece8",
    decorations: [
      { type: "rect", x: 4, y: 4, w: 892, h: 512, rx: 10, fill: "#d4ccc4", stroke: "#a89d92", sw: 1.5 },
      { type: "rect", x: 12, y: 12, w: 876, h: 496, rx: 8, fill: "#f7f4f0", stroke: "#c4b9ae", sw: 0.8 },
      { type: "rect", x: 12, y: 240, w: 876, h: 42, rx: 0, fill: "#c4b9ae" },
      { type: "text", x: 450, y: 261, text: "← DRIVING LANE →", fontSize: 9, fill: "#6b5e52", anchor: "middle" },
      // Ramp up indicator (left)
      { type: "rect", x: 12, y: 460, w: 80, h: 48, rx: 4, fill: "#0ea5e9" },
      { type: "text", x: 52, y: 484, text: "RAMP↑", fontSize: 9, fill: "#fff", anchor: "middle" },
      // Ramp down indicator (right)
      { type: "rect", x: 808, y: 460, w: 80, h: 48, rx: 4, fill: "#f59e0b" },
      { type: "text", x: 848, y: 484, text: "RAMP↓", fontSize: 9, fill: "#fff", anchor: "middle" },
      // Pillars
      { type: "rect", x: 296, y: 44, w: 10, h: 188, rx: 2, fill: "#9ca3af" },
      { type: "rect", x: 596, y: 44, w: 10, h: 188, rx: 2, fill: "#9ca3af" },
      { type: "rect", x: 296, y: 288, w: 10, h: 164, rx: 2, fill: "#9ca3af" },
      { type: "rect", x: 596, y: 288, w: 10, h: 164, rx: 2, fill: "#9ca3af" },
    ],
    zones: [
      { match: "T2-A", x: 22, y: 44, w: 264, h: 188 },
      { match: "T2-B", x: 315, y: 44, w: 270, h: 188 },
      { match: "T2-C", x: 615, y: 44, w: 273, h: 188 },
      { match: "T2-D", x: 22, y: 288, w: 264, h: 164 },
      { match: "T2-E", x: 315, y: 288, w: 270, h: 164 },
      { match: "T2-F", x: 615, y: 288, w: 273, h: 164 },
    ],
  },

  /* ────────────────────────────────────────────────
     Bãi xe FPT HCM – Tầng 3 (mixed: xe máy + ô tô)
  ──────────────────────────────────────────────── */
  "Bãi xe FPT HCM|3": {
    vbW: 900, vbH: 440,
    bg: "#ecf5ec",
    decorations: [
      { type: "rect", x: 4, y: 4, w: 892, h: 432, rx: 10, fill: "#c4dcc4", stroke: "#8ab38a", sw: 1.5 },
      { type: "rect", x: 12, y: 12, w: 876, h: 416, rx: 8, fill: "#f0f8f0", stroke: "#a8cca8", sw: 0.8 },
      // Divider lane between zones
      { type: "rect", x: 442, y: 40, w: 16, h: 360, rx: 0, fill: "#a8cca8" },
      { type: "text", x: 450, y: 220, text: "│", fontSize: 24, fill: "#8ab38a", anchor: "middle" },
      // Ramp (top-center)
      { type: "rect", x: 380, y: 4, w: 140, h: 30, rx: 4, fill: "#0ea5e9" },
      { type: "text", x: 450, y: 19, text: "↓ RAMP TỪ TẦNG 2", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      // Label motorbike / car
      { type: "rect", x: 20, y: 40, w: 100, h: 20, rx: 4, fill: "#16a34a" },
      { type: "text", x: 70, y: 50, text: "XE MÁY", fontSize: 8.5, fill: "#fff", anchor: "middle" },
      { type: "rect", x: 462, y: 40, w: 100, h: 20, rx: 4, fill: "#2563eb" },
      { type: "text", x: 512, y: 50, text: "Ô TÔ", fontSize: 8.5, fill: "#fff", anchor: "middle" },
    ],
    zones: [
      { match: "T3-XM-A", x: 20, y: 68, w: 412, h: 334 },
      { match: "T3-OT-A", x: 468, y: 68, w: 412, h: 334 },
    ],
  },

  /* ────────────────────────────────────────────────
     pink pi – Tầng 1 (2 xe máy top + 2 ô tô bottom)
  ──────────────────────────────────────────────── */
  "pink pi|1": {
    vbW: 900, vbH: 520,
    bg: "#fdf0f5",
    decorations: [
      { type: "rect", x: 4, y: 4, w: 892, h: 512, rx: 10, fill: "#f0c8dc", stroke: "#d48aac", sw: 1.5 },
      { type: "rect", x: 12, y: 12, w: 876, h: 496, rx: 8, fill: "#fef5f9", stroke: "#e8b0cc", sw: 0.8 },
      // Road lane between xe máy and ô tô rows
      { type: "rect", x: 12, y: 242, w: 876, h: 40, rx: 0, fill: "#e8b0cc" },
      { type: "text", x: 450, y: 262, text: "← LANE →", fontSize: 9, fill: "#8b4566", anchor: "middle" },
      // Divider lane between left/right zones
      { type: "rect", x: 444, y: 44, w: 12, h: 190, rx: 0, fill: "#e8b0cc" },
      { type: "rect", x: 444, y: 290, w: 12, h: 200, rx: 0, fill: "#e8b0cc" },
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
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9|]+/g, " ")
      .trim()
      .toLowerCase();

  const normalizedTarget = normalize(key);
  const matched = Object.entries(FLOOR_PLANS).find(([planKey]) => normalize(planKey) === normalizedTarget);
  return matched?.[1] || null;
}
