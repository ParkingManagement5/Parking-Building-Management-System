package com.swp391.parking.repository;

import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ParkingSlotRepositoryLockingTest extends AbstractIntegrationTestSupport {

    @Test
    void findFirstAvailableByBuildingAndSlotSizeForUpdate_shouldReturnDeterministicAvailableSlot() {
        ParkingBuilding building = createBuilding("Lock Building");
        VehicleType vehicleType = createVehicleType("Lock Car", VehicleType.SlotSize.MEDIUM);
        Floor floorOne = createFloor(building, 1);
        Floor floorTwo = createFloor(building, 2);
        Zone zoneOne = createZone(floorOne, vehicleType, "Zone 1");
        Zone zoneTwo = createZone(floorTwo, vehicleType, "Zone 2");
        createSlot(zoneTwo, "B-01", ParkingSlot.Status.AVAILABLE);
        ParkingSlot expected = createSlot(zoneOne, "A-01", ParkingSlot.Status.AVAILABLE);
        createSlot(zoneOne, "A-02", ParkingSlot.Status.AVAILABLE);

        List<ParkingSlot> result = parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                building.getId(), ParkingSlot.SlotSize.MEDIUM, PageRequest.of(0, 1));

        assertEquals(1, result.size());
        assertEquals(expected.getId(), result.get(0).getId());
    }

    @Test
    void findFirstAvailableByBuildingAndSlotSizeForUpdate_shouldFilterUnavailableOrInactiveHierarchy() {
        ParkingBuilding building = createBuilding("Filter Building");
        ParkingBuilding inactiveBuilding = createBuilding("Inactive Building");
        inactiveBuilding.setIsActive(false);
        buildingRepository.save(inactiveBuilding);
        VehicleType vehicleType = createVehicleType("Filter Car", VehicleType.SlotSize.MEDIUM);
        Floor activeFloor = createFloor(building, 1);
        Floor inactiveFloor = createFloor(building, 2);
        inactiveFloor.setIsActive(false);
        floorRepository.save(inactiveFloor);
        Floor inactiveBuildingFloor = createFloor(inactiveBuilding, 1);
        Zone activeZone = createZone(activeFloor, vehicleType, "Active Zone");
        Zone inactiveZone = createZone(activeFloor, vehicleType, "Inactive Zone");
        inactiveZone.setIsActive(false);
        zoneRepository.save(inactiveZone);
        Zone inactiveFloorZone = createZone(inactiveFloor, vehicleType, "Inactive Floor Zone");
        Zone inactiveBuildingZone = createZone(inactiveBuildingFloor, vehicleType, "Inactive Building Zone");

        createSlot(activeZone, "OCCUPIED", ParkingSlot.Status.OCCUPIED);
        ParkingSlot inactiveSlot = createSlot(activeZone, "INACTIVE", ParkingSlot.Status.AVAILABLE);
        inactiveSlot.setIsActive(false);
        parkingSlotRepository.save(inactiveSlot);
        createSlot(inactiveZone, "BAD-ZONE", ParkingSlot.Status.AVAILABLE);
        createSlot(inactiveFloorZone, "BAD-FLOOR", ParkingSlot.Status.AVAILABLE);
        createSlot(inactiveBuildingZone, "BAD-BUILDING", ParkingSlot.Status.AVAILABLE);
        ParkingSlot expected = createSlot(activeZone, "OK", ParkingSlot.Status.AVAILABLE);

        List<ParkingSlot> result = parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                building.getId(), ParkingSlot.SlotSize.MEDIUM, PageRequest.of(0, 1));

        assertEquals(1, result.size());
        assertEquals(expected.getId(), result.get(0).getId());
    }

    @Test
    void findFirstAvailableByBuildingAndSlotSizeForUpdate_shouldReturnEmptyWhenNoCandidate() {
        ParkingBuilding building = createBuilding("No Candidate Building");
        VehicleType vehicleType = createVehicleType("No Candidate Car", VehicleType.SlotSize.MEDIUM);
        Floor floor = createFloor(building, 1);
        Zone zone = createZone(floor, vehicleType, "No Candidate Zone");
        createSlot(zone, "OCCUPIED", ParkingSlot.Status.OCCUPIED);

        List<ParkingSlot> result = parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                building.getId(), ParkingSlot.SlotSize.MEDIUM, PageRequest.of(0, 1));

        assertTrue(result.isEmpty());
    }
}
