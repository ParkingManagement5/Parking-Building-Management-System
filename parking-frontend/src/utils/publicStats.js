import { buildingApi } from "../api/manager/buildingApi";
import { floorApi } from "../api/manager/floorApi";
import { zoneApi } from "../api/manager/zoneApi";
import { parkingSlotApi } from "../api/manager/parkingSlotApi";
import { unwrapApiData } from "./api";

function getBuildingId(building) {
  return building?.buildingId ?? building?.id;
}

function getFloorId(floor) {
  return floor?.floorId ?? floor?.id;
}

function getZoneId(zone) {
  return zone?.zoneId ?? zone?.id;
}

function getSettledData(result, fallback = []) {
  if (result?.status !== "fulfilled") return fallback;
  return unwrapApiData(result.value?.data, fallback);
}

export async function fetchPublicParkingOverview() {
  const bRes = await buildingApi.getAll();
  const buildings = unwrapApiData(bRes.data, []);
  const buildingIds = buildings.map(getBuildingId).filter(Boolean);

  if (!buildingIds.length) {
    return { buildingCount: 0, total: 0, available: 0, occupied: 0 };
  }

  const floorResults = await Promise.allSettled(buildingIds.map((id) => floorApi.getByBuilding(id)));
  const floors = floorResults.flatMap((result) => getSettledData(result, []));

  const zoneResults = await Promise.allSettled(
    floors.map((floor) => {
      const floorId = getFloorId(floor);
      return floorId ? zoneApi.getByFloor(floorId) : Promise.resolve({ data: { data: [] } });
    })
  );
  const zones = zoneResults.flatMap((result) => getSettledData(result, []));

  const slotResults = await Promise.allSettled(
    zones.map((zone) => {
      const zoneId = getZoneId(zone);
      return zoneId ? parkingSlotApi.getByZone(zoneId) : Promise.resolve({ data: { data: [] } });
    })
  );
  const allSlots = slotResults.flatMap((result) => getSettledData(result, []));

  return {
    buildingCount: buildingIds.length,
    total: allSlots.length,
    available: allSlots.filter((s) => s.status === "AVAILABLE").length,
    occupied: allSlots.filter((s) => s.status === "OCCUPIED").length,
  };
}
