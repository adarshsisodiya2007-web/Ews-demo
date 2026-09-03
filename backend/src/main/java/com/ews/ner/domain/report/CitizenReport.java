package com.ews.ner.domain.report;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="citizen_report")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CitizenReport {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "reporter_type_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private ReporterType reporterType;
    
    private UUID reporterId;
    private BigDecimal geoLat;
    private BigDecimal geoLng;
    private UUID regionId;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "report_category_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private ReportCategory category;
    
    private String description;
    private String photoUrl;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "report_status_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;
    
    private OffsetDateTime createdAt;
    private OffsetDateTime syncedAt;
    
    @Column(name = "client_report_id")
    private String clientReportId;

    public enum ReporterType { CITIZEN, FIELD_OFFICER }
    public enum ReportCategory { CRACK, SLOPE_MOVEMENT, BLOCKED_ROAD, FLOODING, OTHER }
    public enum ReportStatus { PENDING, VERIFIED, RESOLVED, DISMISSED }
}
