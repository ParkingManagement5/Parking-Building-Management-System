package com.swp391.parking.repository;

import com.swp391.parking.entity.OcrScan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OcrScanRepository extends JpaRepository<OcrScan, Long> {
    List<OcrScan> findBySession_Id(Long sessionId);
    List<OcrScan> findByProcessStatus(OcrScan.ProcessStatus processStatus);
}
