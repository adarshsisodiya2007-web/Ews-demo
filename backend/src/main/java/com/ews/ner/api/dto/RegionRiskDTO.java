package com.ews.ner.api.dto;

import com.ews.ner.domain.region.Region.RoadStatus;
import com.ews.ner.domain.risk.RiskScore.Severity;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class RegionRiskDTO {
    private UUID regionId;
    private String name;
    private String district;
    private String state;
    private Double centroidLat;
    private Double centroidLng;
    private Severity severity;
    private BigDecimal computedScore;
    private OffsetDateTime computedAt;
    private Map<String, Object> contributingFactors;
    private RoadStatus roadStatus;
}
