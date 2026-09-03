package com.ews.ner.domain.alert;

import com.ews.ner.domain.risk.RiskScore.Severity;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="alert")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Alert {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID regionId;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "severity_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private Severity severity;
    
    private String messageEn;
    private String messageAs;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "alert_channel_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private AlertChannel channel;
    
    private String contributingSummary;
    private String capXml;
    private OffsetDateTime sentAt;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "alert_status_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    @Builder.Default
    private AlertStatus status = AlertStatus.PENDING;
    
    private OffsetDateTime createdAt;

    public enum AlertChannel { SMS, APP, WEB, CAP_FEED }
    public enum AlertStatus { PENDING, SENT, FAILED }
}
