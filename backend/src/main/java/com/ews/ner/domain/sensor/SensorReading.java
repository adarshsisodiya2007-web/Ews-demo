package com.ews.ner.domain.sensor;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="sensor_reading")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SensorReading {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID regionId;
    @Column(name = "rainfall_mm_24h")
    private BigDecimal rainfallMm24h;

    @Column(name = "rainfall_mm_72h")
    private BigDecimal rainfallMm72h;
    private BigDecimal soilMoisturePct;
    @Column(name = "temperature_c")
    private BigDecimal temperatureC;
    
    @Builder.Default
    private String source = "SYNTHETIC";
    
    private OffsetDateTime recordedAt;
}
