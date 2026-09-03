package com.ews.ner.api.dto;

import com.ews.ner.domain.alert.Alert.AlertChannel;
import com.ews.ner.domain.alert.Alert.AlertStatus;
import com.ews.ner.domain.risk.RiskScore.Severity;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class AlertDTO {
    private UUID id;
    private UUID regionId;
    private String regionName;
    private Severity severity;
    private String messageEn;
    private String messageAs;
    private String contributingSummary;
    private AlertChannel channel;
    private AlertStatus status;
    private java.math.BigDecimal computedScore;  // risk score that triggered this alert
    private OffsetDateTime createdAt;
}
