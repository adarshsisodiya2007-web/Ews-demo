package com.ews.ner.api;

import com.ews.ner.api.dto.RegionRiskDTO;
import com.ews.ner.domain.risk.RiskScore;
import com.ews.ner.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {
    private final RiskService riskService;
    
    @GetMapping("/heatmap")
    public ResponseEntity<List<RegionRiskDTO>> getHeatmap() {
        return ResponseEntity.ok(riskService.getHeatmap());
    }
    
    @GetMapping("/regions/{regionId}")
    public ResponseEntity<com.ews.ner.api.dto.RiskDetailDTO> getRegionDetail(@PathVariable UUID regionId) {
        return ResponseEntity.ok(riskService.getRegionDetail(regionId));
    }
    
    @PostMapping("/recompute")
    public ResponseEntity<Void> recomputeAll() {
        riskService.recomputeAll();
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/recompute/{regionId}")
    public ResponseEntity<RiskScore> recomputeRegion(@PathVariable UUID regionId) {
        return ResponseEntity.ok(riskService.computeAndSave(regionId));
    }
}
