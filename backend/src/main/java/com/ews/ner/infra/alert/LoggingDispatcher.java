package com.ews.ner.infra.alert;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.alert.Alert.AlertStatus;
import com.ews.ner.domain.alert.AlertRepository;
import com.ews.ner.domain.region.Region;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class LoggingDispatcher implements AlertDispatcher {
    private final AlertRepository alertRepo;

    @Override
    public void dispatch(Alert alert, Region region) {
        log.warn("=== ALERT SENT ===");
        log.warn("Region: {} ({})", region.getName(), region.getDistrict());
        log.warn("Severity: {}", alert.getSeverity());
        log.warn("Message EN: {}", alert.getMessageEn());
        log.warn("Message AS: {}", alert.getMessageAs());
        log.warn("==================");
        
        alert.setStatus(AlertStatus.SENT);
        alert.setSentAt(OffsetDateTime.now());
        alertRepo.save(alert);
    }

    @Override
    public String channelName() {
        return "LOGGING";
    }
}
