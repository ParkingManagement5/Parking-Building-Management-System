package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.ZoneRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BuildingServiceImplTest {

    private static final Long BUILDING_ID = 1L;

    @Mock
    private ParkingBuildingRepository buildingRepo;

    @Mock
    private FloorRepository floorRepo;

    @Mock
    private ZoneRepository zoneRepo;

    @Mock
    private ParkingSlotRepository parkingSlotRepo;

    @Mock
    private GateRepository gateRepo;

    @InjectMocks
    private BuildingServiceImpl buildingService;

    @Test
    void create_shouldRejectNon24HoursMissingHours() {
        BuildingRequest request = buildingRequest(false, null, LocalTime.of(22, 0));
        given(buildingRepo.existsByName(request.getName())).willReturn(false);

        AppException exception = assertThrows(AppException.class,
                () -> buildingService.create(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(buildingRepo, never()).save(any());
    }

    @Test
    void create_shouldRejectNon24HoursEqualOpenClose() {
        BuildingRequest request = buildingRequest(false, LocalTime.of(6, 0), LocalTime.of(6, 0));
        given(buildingRepo.existsByName(request.getName())).willReturn(false);

        AppException exception = assertThrows(AppException.class,
                () -> buildingService.create(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(buildingRepo, never()).save(any());
    }

    @Test
    void create_shouldCreate24HoursBuilding() {
        BuildingRequest request = buildingRequest(true, LocalTime.of(6, 0), LocalTime.of(6, 0));
        given(buildingRepo.existsByName(request.getName())).willReturn(false);
        given(buildingRepo.save(any(ParkingBuilding.class))).willAnswer(invocation -> invocation.getArgument(0));

        ParkingBuilding created = buildingService.create(request);

        ArgumentCaptor<ParkingBuilding> captor = ArgumentCaptor.forClass(ParkingBuilding.class);
        verify(buildingRepo).save(captor.capture());
        assertSame(created, captor.getValue());
        assertTrue(captor.getValue().getIs24Hours());
        assertEquals(request.getOpenTime(), captor.getValue().getOpenTime());
        assertEquals(request.getCloseTime(), captor.getValue().getCloseTime());
    }

    @Test
    void update_shouldAllowChangingNormalBuildingTo24Hours() {
        ParkingBuilding building = building(false, LocalTime.of(6, 0), LocalTime.of(22, 0));
        BuildingRequest request = buildingRequest(true, LocalTime.of(6, 0), LocalTime.of(6, 0));
        given(buildingRepo.findById(BUILDING_ID)).willReturn(Optional.of(building));
        given(buildingRepo.save(building)).willReturn(building);

        ParkingBuilding updated = buildingService.update(BUILDING_ID, request);

        assertSame(building, updated);
        assertTrue(building.getIs24Hours());
        assertEquals(LocalTime.of(6, 0), building.getOpenTime());
        assertEquals(LocalTime.of(6, 0), building.getCloseTime());
    }

    @Test
    void update_shouldRejectChanging24HoursBuildingToNormalWithInvalidHours() {
        ParkingBuilding building = building(true, LocalTime.of(6, 0), LocalTime.of(6, 0));
        BuildingRequest request = buildingRequest(false, LocalTime.of(6, 0), LocalTime.of(6, 0));
        given(buildingRepo.findById(BUILDING_ID)).willReturn(Optional.of(building));

        AppException exception = assertThrows(AppException.class,
                () -> buildingService.update(BUILDING_ID, request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertTrue(building.getIs24Hours());
        verify(buildingRepo, never()).save(any());
    }

    @Test
    void update_shouldPreserve24HoursWhenFieldIsNull() {
        ParkingBuilding building = building(true, LocalTime.of(6, 0), LocalTime.of(6, 0));
        BuildingRequest request = buildingRequest(null, LocalTime.of(6, 0), LocalTime.of(6, 0));
        given(buildingRepo.findById(BUILDING_ID)).willReturn(Optional.of(building));
        given(buildingRepo.save(building)).willReturn(building);

        ParkingBuilding updated = buildingService.update(BUILDING_ID, request);

        assertSame(building, updated);
        assertTrue(building.getIs24Hours());
        assertEquals(LocalTime.of(6, 0), building.getOpenTime());
        assertEquals(LocalTime.of(6, 0), building.getCloseTime());
    }

    @Test
    void update_shouldPreserveNon24HoursWhenFieldIsNull() {
        ParkingBuilding building = building(false, LocalTime.of(6, 0), LocalTime.of(22, 0));
        BuildingRequest request = buildingRequest(null, LocalTime.of(7, 0), LocalTime.of(21, 0));
        given(buildingRepo.findById(BUILDING_ID)).willReturn(Optional.of(building));
        given(buildingRepo.save(building)).willReturn(building);

        ParkingBuilding updated = buildingService.update(BUILDING_ID, request);

        assertSame(building, updated);
        assertFalse(building.getIs24Hours());
        assertEquals(LocalTime.of(7, 0), building.getOpenTime());
        assertEquals(LocalTime.of(21, 0), building.getCloseTime());
    }

    @Test
    void create_shouldNormalizeNull24HoursToFalse() {
        BuildingRequest request = buildingRequest(null, LocalTime.of(6, 0), LocalTime.of(22, 0));
        given(buildingRepo.existsByName(request.getName())).willReturn(false);
        given(buildingRepo.save(any(ParkingBuilding.class))).willAnswer(invocation -> invocation.getArgument(0));

        ParkingBuilding created = buildingService.create(request);

        assertFalse(created.getIs24Hours());
    }

    private BuildingRequest buildingRequest(Boolean is24Hours, LocalTime openTime, LocalTime closeTime) {
        return BuildingRequest.builder()
                .name("Main Building")
                .address("123 Street")
                .phone("0900000000")
                .email("building@example.com")
                .description("Test building")
                .openTime(openTime)
                .closeTime(closeTime)
                .is24Hours(is24Hours)
                .build();
    }

    private ParkingBuilding building(Boolean is24Hours, LocalTime openTime, LocalTime closeTime) {
        return ParkingBuilding.builder()
                .id(BUILDING_ID)
                .name("Old Building")
                .address("Old Street")
                .openTime(openTime)
                .closeTime(closeTime)
                .is24Hours(is24Hours)
                .isActive(true)
                .build();
    }
}
