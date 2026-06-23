package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OcrRecognitionResult {
    private String plate;
    private Float confidence;
}
