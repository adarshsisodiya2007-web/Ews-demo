package com.ews.ner.domain.terrain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name="terrain_profile")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TerrainProfile {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(unique = true)
    private UUID regionId;
    
    private BigDecimal slopeAngleDeg;
    @Column(name = "elevation_m")
    private int elevationM;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "land_use_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private LandUse landUse;
    
    private String soilType;
    private String notes;

    public enum LandUse { FOREST, AGRICULTURE, BARE, SETTLEMENT, MIXED }
}
