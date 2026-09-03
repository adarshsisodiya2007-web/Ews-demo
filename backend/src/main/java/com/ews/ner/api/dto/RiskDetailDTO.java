package com.ews.ner.api.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class RiskDetailDTO extends RegionRiskDTO {
    private List<CitizenReportDTO> recentReports;
    private List<SensorReadingDTO> weatherTrend;
}
