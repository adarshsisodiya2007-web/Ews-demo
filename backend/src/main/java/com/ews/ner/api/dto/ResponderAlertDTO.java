package com.ews.ner.api.dto;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.risk.RiskScore;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ResponderAlertDTO {
    private UUID id;
    private String title;
    private String description;       // messageEn
    private RiskScore.Severity severity;
    private Alert.AlertStatus status;
    private String scope;
    private String alertType;

    // Location
    private UUID regionId;
    private String locationName;
    private String targetRegion;
    private String district;
    private String state;
    private BigDecimal lat;
    private BigDecimal lng;

    // Meta
    private UUID createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime startTime;
    private OffsetDateTime expiryTime;

    public static ResponderAlertDTO from(Alert a) {
        ResponderAlertDTO dto = new ResponderAlertDTO();
        dto.setId(a.getId());
        dto.setTitle(a.getTitle());
        dto.setDescription(a.getMessageEn());
        dto.setSeverity(a.getSeverity());
        dto.setStatus(a.getStatus());
        dto.setScope(a.getScope());
        dto.setAlertType(a.getAlertType());
        dto.setRegionId(a.getRegionId());
        dto.setLocationName(a.getLocationName());
        dto.setTargetRegion(a.getLocationName());
        dto.setDistrict(a.getDistrict());
        dto.setState(a.getState());
        dto.setLat(a.getLat());
        dto.setLng(a.getLng());
        dto.setCreatedBy(a.getCreatedBy());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setUpdatedAt(a.getUpdatedAt());
        dto.setStartTime(a.getStartTime());
        dto.setExpiryTime(a.getExpiryTime());
        return dto;
    }
}
