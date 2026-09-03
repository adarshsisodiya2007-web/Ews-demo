package com.ews.ner.domain.landslide;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface HistoricalLandslideRepository extends JpaRepository<HistoricalLandslide, UUID> {
    List<HistoricalLandslide> findByRegionIdAndEventDateAfter(UUID regionId, LocalDate after);
    long countByRegionIdAndEventDateAfter(UUID regionId, LocalDate after);
}
