package com.ews.ner.infra.sms;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsGatewayService {

    @Value("${app.alert.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${app.twilio.account-sid:DEMO_SID}")
    private String accountSid;

    @Value("${app.twilio.auth-token:DEMO_TOKEN}")
    private String authToken;

    @Value("${app.twilio.from-number:+15005550006}")
    private String fromNumber;

    private boolean twilioInitialized = false;

    @PostConstruct
    public void init() {
        if (smsEnabled && isConfigured()) {
            try {
                Twilio.init(accountSid, authToken);
                twilioInitialized = true;
                log.info("Twilio SMS Gateway successfully initialized with sender: {}", fromNumber);
            } catch (Exception e) {
                log.error("Failed to initialize Twilio SMS Gateway: {}", e.getMessage());
            }
        } else {
            log.info("SMS Gateway running in MOCK/DEMO mode (smsEnabled={}, configured={})", smsEnabled, isConfigured());
        }
    }

    public boolean isConfigured() {
        return accountSid != null && !accountSid.isBlank() && !"DEMO_SID".equals(accountSid)
                && authToken != null && !authToken.isBlank() && !"DEMO_TOKEN".equals(authToken)
                && fromNumber != null && !fromNumber.isBlank();
    }

    public boolean isLiveSmsAvailable() {
        return smsEnabled && twilioInitialized && isConfigured();
    }

    /**
     * Dispatches an SMS message.
     * In demo mode or if credentials are unconfigured, logs the SMS without throwing error.
     * In strict live SMS mode, dispatches to Twilio.
     */
    public boolean sendSms(String toPhoneNumber, String messageBody) {
        if (isLiveSmsAvailable()) {
            try {
                log.info("Sending live carrier SMS to {}...", toPhoneNumber);
                Message msg = Message.creator(
                        new PhoneNumber(toPhoneNumber),
                        new PhoneNumber(fromNumber),
                        messageBody
                ).create();
                log.info("SMS dispatched successfully. SID: {}", msg.getSid());
                return true;
            } catch (Exception e) {
                log.error("Failed to dispatch live SMS to {}: {}", toPhoneNumber, e.getMessage());
                throw new IllegalStateException("Failed to deliver SMS: " + e.getMessage());
            }
        } else {
            log.info("[SMS MOCK/DEMO DISPATCH] To: {}, Content: \"{}\"", toPhoneNumber, messageBody);
            return false;
        }
    }
}
