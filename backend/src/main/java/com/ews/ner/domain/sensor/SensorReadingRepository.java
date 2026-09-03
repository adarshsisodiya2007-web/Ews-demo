package com.ews.ner.domain.sensor;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SensorReadingRepository extends JpaRepository<SensorReading, UUID> {
    Optional<SensorReading> findTopByRegionIdOrderByRecordedAtDesc(UUID regionId);
    List<SensorReading> findByRegionIdAndRecordedAtAfterOrderByRecordedAtDesc(UUID regionId, OffsetDateTime after);
    List<SensorReading> findTop24ByRegionIdOrderByRecordedAtDesc(UUID regionId);
}
