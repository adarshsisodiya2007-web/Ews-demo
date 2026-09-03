package com.ews.ner.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class SensorReadingDTO {
    private BigDecimal rainfallMm24h;
    private BigDecimal soilMoisturePct;
    private OffsetDateTime recordedAt;
}
