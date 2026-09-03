package com.ews.ner.infra.alert;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.alert.Alert.AlertStatus;
import com.ews.ner.domain.alert.AlertRepository;
import com.ews.ner.domain.region.Region;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import java.time.OffsetDateTime;

@Component
@ConditionalOnProperty(name = "app.alert.sms.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class TwilioSmsDispatcher implements AlertDispatcher {
    private final AlertRepository alertRepo;
    
    @Override
    public void dispatch(Alert alert, Region region) {
        try {
            // Mocking Twilio SDK execution
            log.info("Sending SMS via Twilio: {}", alert.getMessageEn());
            alert.setStatus(AlertStatus.SENT);
            alert.setSentAt(OffsetDateTime.now());
        } catch (Exception e) {
            log.error("Failed to send Twilio SMS", e);
            alert.setStatus(AlertStatus.FAILED);
        }
        alertRepo.save(alert);
    }

    @Override
    public String channelName() {
        return "TWILIO_SMS";
    }
}
