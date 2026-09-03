package com.ews.ner.domain.landslide;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="historical_landslide")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HistoricalLandslide {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID regionId;
    private LocalDate eventDate;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "event_severity_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private EventSeverity severity;
    
    private Integer casualties;
    private String source;
    private String notes;
    private OffsetDateTime createdAt;

    public enum EventSeverity { MINOR, MODERATE, MAJOR, CATASTROPHIC }
}
