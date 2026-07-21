package com.swp391.parking.controller;

import com.swp391.parking.dto.request.VehicleTypeRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.service.VehicleTypeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class VehicleTypeControllerTest {

    @Mock
    private VehicleTypeService vehicleTypeService;

    @InjectMocks
    private VehicleTypeController vehicleTypeController;

    @Test
    void getAll_shouldWrapServiceResult() {
        VehicleType type = VehicleType.builder()
            .id(1L)
            .name("Car")
            .slotSize(VehicleType.SlotSize.MEDIUM)
            .hourlyRate(new BigDecimal("10000"))
            .dailyRate(new BigDecimal("70000"))
            .isActive(true)
            .build();
        given(vehicleTypeService.getAll()).willReturn(List.of(type));

        ResponseEntity<ApiResponse<List<VehicleType>>> response = vehicleTypeController.getAll();

        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals(1, response.getBody().getData().size());
        assertEquals("Car", response.getBody().getData().get(0).getName());
    }

    @Test
    void create_shouldReturnCreatedVehicleType() {
        VehicleTypeRequest request = VehicleTypeRequest.builder()
            .name("Motorbike")
            .description("Two-wheel vehicle")
            .slotSize(VehicleType.SlotSize.SMALL)
            .hourlyRate(new BigDecimal("5000"))
            .dailyRate(new BigDecimal("30000"))
            .build();
        VehicleType saved = VehicleType.builder()
            .id(5L)
            .name(request.getName())
            .description(request.getDescription())
            .slotSize(request.getSlotSize())
            .hourlyRate(request.getHourlyRate())
            .dailyRate(request.getDailyRate())
            .isActive(true)
            .build();
        given(vehicleTypeService.create(any(VehicleTypeRequest.class))).willReturn(saved);

        ResponseEntity<ApiResponse<VehicleType>> response = vehicleTypeController.create(request);

        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Tao loai xe thanh cong", response.getBody().getMessage());
        assertEquals(5L, response.getBody().getData().getId());
    }
}
