import { parkingSlotApi } from "../api/manager/parkingSlotApi";
import { unwrapApiData } from "./api";

export async function fetchPublicParkingOverview() {
  const res = await parkingSlotApi.getPublicStats();
  const stats = unwrapApiData(res.data, {});
  return {
    buildingCount: stats.buildingCount ?? 0,
    total: stats.total ?? 0,
    available: stats.available ?? 0,
    occupied: stats.occupied ?? 0,
  };
}
