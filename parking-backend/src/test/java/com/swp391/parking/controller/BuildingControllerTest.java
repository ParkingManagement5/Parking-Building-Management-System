package com.swp391.parking.controller;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.service.BuildingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BuildingControllerTest {

    @Mock
    private BuildingService buildingService;

    @InjectMocks
    private BuildingController buildingController;

    @Test
    void getAll_shouldWrapServiceResult() {
        ParkingBuilding building = ParkingBuilding.builder()
            .id(1L)
            .name("Main Building")
            .address("123 Street")
            .openTime(LocalTime.of(6, 0))
            .closeTime(LocalTime.of(22, 0))
            .isActive(true)
            .build();
        given(buildingService.getAll()).willReturn(List.of(building));

        ResponseEntity<ApiResponse<List<ParkingBuilding>>> response = buildingController.getAll();

        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals(1, response.getBody().getData().size());
        assertEquals("Main Building", response.getBody().getData().get(0).getName());
    }

    @Test
    void create_shouldReturnCreatedBuilding() {
        BuildingRequest request = BuildingRequest.builder()
            .name("Main Building")
            .address("123 Street")
            .openTime(LocalTime.of(6, 0))
            .closeTime(LocalTime.of(22, 0))
            .build();
        ParkingBuilding saved = ParkingBuilding.builder()
            .id(1L)
            .name(request.getName())
            .address(request.getAddress())
            .openTime(request.getOpenTime())
            .closeTime(request.getCloseTime())
            .isActive(true)
            .build();
        given(buildingService.create(any(BuildingRequest.class))).willReturn(saved);

        ResponseEntity<ApiResponse<ParkingBuilding>> response = buildingController.create(request);

        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Tạo toà nhà thành công", response.getBody().getMessage());
        assertEquals(1L, response.getBody().getData().getId());
    }

    @Test
    void update_shouldReturnUpdatedBuilding() {
        BuildingRequest request = BuildingRequest.builder()
            .name("Updated Building")
            .address("456 Street")
            .openTime(LocalTime.of(7, 0))
            .closeTime(LocalTime.of(21, 0))
            .build();
        ParkingBuilding updated = ParkingBuilding.builder()
            .id(2L)
            .name(request.getName())
            .address(request.getAddress())
            .openTime(request.getOpenTime())
            .closeTime(request.getCloseTime())
            .isActive(true)
            .build();
        given(buildingService.update(eq(2L), any(BuildingRequest.class))).willReturn(updated);

        ResponseEntity<ApiResponse<ParkingBuilding>> response = buildingController.update(2L, request);

        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertNotNull(response.getBody());
        assertEquals("Updated Building", response.getBody().getData().getName());
    }

    @Test
    void deactivate_shouldReturnSuccessMessage() {
        ResponseEntity<ApiResponse<Void>> response = buildingController.deactivate(3L);

        verify(buildingService).deactivate(3L);
        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Đã xoá toà nhà khỏi DB", response.getBody().getMessage());
    }
}
