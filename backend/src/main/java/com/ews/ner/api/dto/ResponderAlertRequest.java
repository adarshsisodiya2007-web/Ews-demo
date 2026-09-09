package com.ews.ner.api.dto;

import com.ews.ner.domain.risk.RiskScore;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ResponderAlertRequest {
    // Required fields
    private String title;
    private String description;        // maps to messageEn
    private RiskScore.Severity severity;  // LOW | MODERATE | HIGH | CRITICAL
    private String scope;              // EXACT_REGION | DISTRICT | STATE

    // Location (at least one of regionId or district must be provided)
    private UUID regionId;
    private String locationName;
    private String district;
    private String state;
    private BigDecimal lat;
    private BigDecimal lng;

    // Optional
    private String alertType;          // LANDSLIDE | FLOOD | EARTHQUAKE | OTHER
    private OffsetDateTime startTime;
    private OffsetDateTime expiryTime;
}
