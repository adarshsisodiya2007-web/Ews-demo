package com.ews.ner.service;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.alert.AlertRepository;
import com.ews.ner.service.LiveFeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Scheduled task: marks ACTIVE alerts as EXPIRED when their expiry_time passes.
 * Runs every 5 minutes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlertExpiryScheduler {

    private final AlertRepository alertRepo;
    private final LiveFeedService liveFeed;

    @Scheduled(fixedDelay = 300_000)  // every 5 minutes
    public void expireAlerts() {
        List<Alert> toExpire = alertRepo.findAlertsToExpire(OffsetDateTime.now());
        if (toExpire.isEmpty()) return;

        for (Alert alert : toExpire) {
            alert.setStatus(Alert.AlertStatus.EXPIRED);
            alert.setUpdatedAt(OffsetDateTime.now());
            alertRepo.save(alert);
            liveFeed.broadcastResponderAlert(alert);  // notify clients
            log.info("Alert expired: {}", alert.getId());
        }
    }
}
