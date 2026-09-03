package com.ews.ner.api.dto;

import com.ews.ner.domain.report.CitizenReport.ReportCategory;
import com.ews.ner.domain.report.CitizenReport.ReportStatus;
import com.ews.ner.domain.report.CitizenReport.ReporterType;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CitizenReportDTO {
    private UUID id;
    private ReporterType reporterType;
    private ReportCategory category;
    private String description;
    private String photoUrl;
    private ReportStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime syncedAt;
    private BigDecimal geoLat;
    private BigDecimal geoLng;
}
