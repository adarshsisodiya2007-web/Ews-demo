package com.ews.ner.service;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.alert.Alert.AlertChannel;
import com.ews.ner.domain.alert.AlertRepository;
import com.ews.ner.domain.region.Region;
import com.ews.ner.domain.risk.RiskScore;
import com.ews.ner.engine.ContributingFactors;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ews.ner.infra.alert.AlertDispatcherComposite;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {
    private final AlertRepository alertRepo;
    private final AlertDispatcherComposite dispatcher;
    private final ObjectMapper objectMapper;
    private final LiveFeedService liveFeed;

    private JsonNode enTemplates;
    private JsonNode asTemplates;

    @PostConstruct
    public void init() throws Exception {
        try (InputStream is = new ClassPathResource("i18n/messages_en.json").getInputStream()) {
            enTemplates = objectMapper.readTree(is);
        }
        try (InputStream is = new ClassPathResource("i18n/messages_as.json").getInputStream()) {
            asTemplates = objectMapper.readTree(is);
        }
    }

    public void checkAndAlert(Region region, RiskScore score) {
        if (score.getSeverityLevel() == RiskScore.Severity.LOW || score.getSeverityLevel() == RiskScore.Severity.MODERATE) {
            return;
        }
        
        // Prevent spam: max 1 alert per severity per region per 12 hours
        boolean recentlyAlerted = alertRepo.existsByRegionIdAndSeverityAndCreatedAtAfter(
                region.getId(), score.getSeverityLevel(), OffsetDateTime.now().minusHours(12));
        if (recentlyAlerted) return;

        ContributingFactors factors = null;
        try {
            factors = objectMapper.readValue(score.getContributingFactors(), ContributingFactors.class);
        } catch (Exception ignored) {}
        
        String summary = factors != null ? factors.toSmsSummary() : "High risk conditions detected";

        Alert alert = Alert.builder()
                .regionId(region.getId())
                .severity(score.getSeverityLevel())
                .messageEn(generateMessage(region, score, "en", summary))
                .messageAs(generateMessage(region, score, "as", summary))
                .channel(AlertChannel.SMS)
                .contributingSummary(summary)
                .createdAt(OffsetDateTime.now())
                .build();
                
        alert = alertRepo.save(alert);
        dispatcher.dispatch(alert, region);
        liveFeed.broadcastAlert(alert, region.getName());
    }

    public String generateMessage(Region region, RiskScore score, String lang, String summary) {
        JsonNode tmpl = lang.equals("as") ? asTemplates : enTemplates;
        String sevStr = score.getSeverityLevel().name();
        String template = tmpl.path("sms").path(sevStr).asText(tmpl.path("sms").path("HIGH").asText("Risk Alert"));
        
        return template.replace("{regionName}", region.getName())
                       .replace("{district}", region.getDistrict() != null ? region.getDistrict() : "")
                       .replace("{state}", region.getState() != null ? region.getState() : "")
                       .replace("{score}", String.valueOf(score.getComputedScore().intValue()))
                       .replace("{summary}", summary)
                       .replace("{smsSummary}", summary);
    }
    
    public List<Alert> getRecentAlerts() {
        return alertRepo.findTop50ByOrderByCreatedAtDesc();
    }
}
