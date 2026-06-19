package com.swp391.parking.dto.request;

import com.swp391.parking.entity.ParkingBuilding.Status;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalTime;

/**
 * DTO nhận dữ liệu tạo/cập nhật tòa nhà từ client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuildingRequest {

    @NotBlank(message = "Tên tòa nhà không được để trống")
    @Size(max = 100, message = "Tên tòa nhà tối đa 100 ký tự")
    private String name;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String address;

    @Size(max = 20)
    private String phone;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 100)
    private String email;

    private String description;

    @NotNull(message = "Giờ mở cửa không được để trống")
    private LocalTime openTime;  // format: "06:00:00"

    @NotNull(message = "Giờ đóng cửa không được để trống")
    private LocalTime closeTime; // format: "22:00:00"

    private Boolean is24Hours;

    private Status status;
}
