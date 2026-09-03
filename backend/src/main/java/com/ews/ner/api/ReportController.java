package com.ews.ner.api;

import com.ews.ner.api.dto.CreateReportRequest;
import com.ews.ner.domain.report.CitizenReport;
import com.ews.ner.domain.report.CitizenReport.ReportStatus;
import com.ews.ner.infra.storage.FileStorageService;
import com.ews.ner.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;
    private final FileStorageService fileStorage;
    private final com.ews.ner.domain.user.AppUserRepository userRepo;

    @PostMapping({"", "/"})
    public ResponseEntity<CitizenReport> createReport(
            @Valid @RequestBody CreateReportRequest req,
            java.security.Principal principal) {
        UUID reporterId = null;
        if (principal != null && principal.getName() != null) {
            reporterId = userRepo.findByUsername(principal.getName())
                    .or(() -> userRepo.findByPhone(principal.getName()))
                    .map(com.ews.ner.domain.user.AppUser::getId)
                    .orElse(null);
        }
        return ResponseEntity.ok(reportService.createReport(req, reporterId, req.getPhotoUrl()));
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadPhoto(@RequestParam("file") MultipartFile file) {
        String url = fileStorage.store(file, "reports");
        return ResponseEntity.ok(url);
    }

    @GetMapping("/region/{regionId}")
    public ResponseEntity<List<CitizenReport>> getReportsForRegion(@PathVariable UUID regionId) {
        return ResponseEntity.ok(reportService.getReportsForRegion(regionId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<CitizenReport>> getRecentReports() {
        return ResponseEntity.ok(reportService.getRecentReports());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CitizenReport> updateStatus(
            @PathVariable UUID id, 
            @RequestParam(required = false) ReportStatus status,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        ReportStatus targetStatus = status;
        if (targetStatus == null && body != null && body.containsKey("status")) {
            targetStatus = ReportStatus.valueOf(body.get("status").toString());
        }
        if (targetStatus == null) {
            targetStatus = ReportStatus.PENDING;
        }
        return ResponseEntity.ok(reportService.updateStatus(id, targetStatus));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> deleteReport(@PathVariable UUID id) {
        reportService.deleteReport(id);
        return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Incident report removed from ledger"));
    }

    @PostMapping("/cleanup")
    public ResponseEntity<java.util.Map<String, Object>> cleanupReports(
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        List<String> idStrings = body != null && body.containsKey("reportIds")
            ? (List<String>) body.get("reportIds")
            : null;
        int deleted;
        if (idStrings != null && !idStrings.isEmpty()) {
            List<UUID> ids = idStrings.stream().map(UUID::fromString).toList();
            deleted = reportService.bulkDeleteReports(ids);
        } else {
            boolean includeResolved = body == null || Boolean.parseBoolean(body.getOrDefault("includeResolved", "true").toString());
            boolean includeDismissed = body == null || Boolean.parseBoolean(body.getOrDefault("includeDismissed", "true").toString());
            deleted = reportService.cleanupOldReports(includeResolved, includeDismissed);
        }
        return ResponseEntity.ok(java.util.Map.of(
            "success", true,
            "deletedCount", deleted,
            "message", "Successfully cleaned up " + deleted + " report(s)"
        ));
    }
}
