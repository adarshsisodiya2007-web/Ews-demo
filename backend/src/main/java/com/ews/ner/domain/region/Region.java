package com.ews.ner.domain.region;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Point;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="region")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Region {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String name;
    private String district;
    private String state;
    private MultiPolygon geometry;
    private Point centroid;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "region_type_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private RegionType regionType;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "road_status_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private RoadStatus roadStatus;
    
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public enum RegionType { VILLAGE, ROAD_SEGMENT }
    public enum RoadStatus { OPEN, BLOCKED, AT_RISK }
}
