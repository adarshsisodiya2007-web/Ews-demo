package com.ews.ner.api;

import com.ews.ner.domain.region.Region;
import com.ews.ner.domain.region.Region.RoadStatus;
import com.ews.ner.domain.region.RegionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/regions")
@RequiredArgsConstructor
public class RegionController {
    private final RegionRepository regionRepo;

    @GetMapping
    public ResponseEntity<List<Region>> getAllRegions(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String state) {
        if (district != null) return ResponseEntity.ok(regionRepo.findByDistrict(district));
        if (state != null) return ResponseEntity.ok(regionRepo.findByState(state));
        return ResponseEntity.ok(regionRepo.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Region> getRegion(@PathVariable UUID id) {
        return regionRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/road-status")
    public ResponseEntity<Region> updateRoadStatus(
            @PathVariable UUID id, 
            @RequestParam(required = false) RoadStatus status,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        RoadStatus targetStatus = status;
        if (targetStatus == null && body != null && body.containsKey("status")) {
            targetStatus = RoadStatus.valueOf(body.get("status").toString());
        }
        if (targetStatus == null) {
            return ResponseEntity.badRequest().build();
        }
        final RoadStatus s = targetStatus;
        return regionRepo.findById(id).map(r -> {
            r.setRoadStatus(s);
            return ResponseEntity.ok(regionRepo.save(r));
        }).orElse(ResponseEntity.notFound().build());
    }
}
