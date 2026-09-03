package com.ews.ner.domain.terrain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface TerrainProfileRepository extends JpaRepository<TerrainProfile, UUID> {
    Optional<TerrainProfile> findByRegionId(UUID regionId);
}
