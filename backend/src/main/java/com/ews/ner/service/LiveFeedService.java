package com.ews.ner.service;

import com.ews.ner.api.dto.AlertDTO;
import com.ews.ner.api.dto.CitizenReportDTO;
import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.report.CitizenReport;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LiveFeedService {
    private final SimpMessagingTemplate messagingTemplate;
    
    public void broadcastAlert(Alert alert, String regionName) {
        AlertDTO dto = new AlertDTO();
        dto.setId(alert.getId());
        dto.setRegionId(alert.getRegionId());
        dto.setRegionName(regionName);
        dto.setSeverity(alert.getSeverity());
        dto.setCreatedAt(alert.getCreatedAt());
        messagingTemplate.convertAndSend("/topic/alerts", dto);
    }
    
    public void broadcastReport(CitizenReport report) {
        CitizenReportDTO dto = new CitizenReportDTO();
        dto.setId(report.getId());
        dto.setCategory(report.getCategory());
        dto.setCreatedAt(report.getCreatedAt());
        messagingTemplate.convertAndSend("/topic/reports", dto);
    }
}
