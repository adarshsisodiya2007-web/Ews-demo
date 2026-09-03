package com.ews.ner.domain.region;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface RegionRepository extends JpaRepository<Region, UUID> {
    List<Region> findByDistrict(String district);
    List<Region> findByState(String state);
    
    @Query("SELECT r FROM Region r WHERE r.regionType = :type")
    List<Region> findByRegionType(@Param("type") Region.RegionType type);

    @Query(value = "SELECT * FROM region r WHERE ST_Within(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), r.geometry) LIMIT 1", nativeQuery = true)
    Region findRegionByPoint(@Param("lng") double lng, @Param("lat") double lat);
}
