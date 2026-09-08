package com.ews.ner.infra.sms;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.Account;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SmsGatewayService {
    private static final Logger log = LoggerFactory.getLogger(SmsGatewayService.class);

    @Value("${app.alert.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${app.twilio.account-sid:DEMO_SID}")
    private String accountSid;

    @Value("${app.twilio.auth-token:DEMO_TOKEN}")
    private String authToken;

    @Value("${app.twilio.from-number:+15005550006}")
    private String fromNumber;

    private volatile boolean twilioInitialized = false;

    @PostConstruct
    public void init() {
        if (isConfigured()) {
            try {
                initTwilio();
                log.info("Twilio SMS Gateway successfully initialized with sender: {}", maskPhone(getEffectiveFromNumber()));
            } catch (Exception e) {
                log.error("Failed to initialize Twilio SMS Gateway at startup: {}", e.getMessage());
            }
        } else {
            log.info("SMS Gateway running in MOCK/DEMO mode (alertSms={}, configured={})",
                    getAppAlertSmsEnabledStatus(), isConfigured());
        }
    }

    private synchronized void initTwilio() {
        String sid = getEffectiveAccountSid();
        String token = getEffectiveAuthToken();
        Twilio.init(sid, token);
        twilioInitialized = true;
    }

    public synchronized void ensureTwilioInitialized() {
        if (!twilioInitialized && isConfigured()) {
            initTwilio();
        }
    }

    private String clean(String val) {
        if (val == null) return null;
        String trimmed = val.trim();
        if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        return trimmed;
    }

    public String getEffectiveAccountSid() {
        String env = clean(System.getenv("TWILIO_ACCOUNT_SID"));
        if (env != null && !env.isBlank()) return env;
        String prop = clean(accountSid);
        if (prop != null && !prop.isBlank()) return prop;
        return null;
    }

    public String getEffectiveAuthToken() {
        String env = clean(System.getenv("TWILIO_AUTH_TOKEN"));
        if (env != null && !env.isBlank()) return env;
        String prop = clean(authToken);
        if (prop != null && !prop.isBlank()) return prop;
        return null;
    }

    public String getEffectiveFromNumber() {
        String env = clean(System.getenv("TWILIO_FROM_NUMBER"));
        if (env != null && !env.isBlank()) return env;
        String prop = clean(fromNumber);
        if (prop != null && !prop.isBlank()) return prop;
        return null;
    }

    public String getAppAlertSmsEnabledStatus() {
        String env = clean(System.getenv("APP_ALERT_SMS_ENABLED"));
        if (env != null && !env.isBlank()) {
            return "true".equalsIgnoreCase(env) ? "true" : "false";
        }
        return smsEnabled ? "true" : "missing";
    }

    public boolean isSidValid(String s) {
        return s != null && !s.isBlank() && !"DEMO_SID".equalsIgnoreCase(s) && !"DEMO_ACCOUNT_SID".equalsIgnoreCase(s);
    }

    public boolean isTokenValid(String t) {
        return t != null && !t.isBlank() && !"DEMO_TOKEN".equalsIgnoreCase(t) && !"DEMO_AUTH_TOKEN".equalsIgnoreCase(t);
    }

    public boolean isFromValid(String f) {
        return f != null && !f.isBlank() && !"+15005550006".equals(f) && !"DEMO_FROM".equalsIgnoreCase(f);
    }

    public boolean isConfigured() {
        return isSidValid(getEffectiveAccountSid())
                && isTokenValid(getEffectiveAuthToken())
                && isFromValid(getEffectiveFromNumber());
    }

    public boolean isLiveSmsAvailable() {
        String alertSms = getAppAlertSmsEnabledStatus();
        if ("false".equalsIgnoreCase(alertSms)) {
            return false;
        }
        return isConfigured();
    }

    public boolean sendSms(String toPhoneNumber, String messageBody) {
        if (!isConfigured()) {
            log.warn("sendSms called but SMS provider is not configured. Destination: {}", maskPhone(toPhoneNumber));
            throw new IllegalStateException("SMS service is currently unavailable. Please try again later.");
        }

        try {
            ensureTwilioInitialized();
            String sender = getEffectiveFromNumber();
            log.info("Dispatching live carrier SMS to {}...", maskPhone(toPhoneNumber));
            
            Message msg = Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(sender),
                    messageBody
            ).create();
            
            log.info("SMS dispatched successfully. Status: {}, SID: {}",
                    msg.getStatus(),
                    msg.getSid() != null ? msg.getSid().substring(0, Math.min(8, msg.getSid().length())) + "..." : "N/A");
            return true;
        } catch (com.twilio.exception.ApiException e) {
            log.error("Twilio API error sending SMS to {}: Code={}, Status={}, Message={}",
                    maskPhone(toPhoneNumber), e.getCode(), e.getStatusCode(), e.getMessage());
            throw new IllegalStateException("Unable to send OTP right now. Please try again.");
        } catch (Exception e) {
            log.error("Failed to dispatch live SMS to {}: {}", maskPhone(toPhoneNumber), e.getMessage());
            throw new IllegalStateException("Unable to send OTP right now. Please try again.");
        }
    }

    public Map<String, Object> getSafeStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        String sid = getEffectiveAccountSid();
        boolean sidConfigured = isSidValid(sid);
        status.put("TWILIO_ACCOUNT_SID", sidConfigured ? "configured" : "missing");

        String tok = getEffectiveAuthToken();
        boolean tokenConfigured = isTokenValid(tok);
        status.put("TWILIO_AUTH_TOKEN", tokenConfigured ? "configured" : "missing");

        String from = getEffectiveFromNumber();
        boolean fromConfigured = isFromValid(from);
        status.put("TWILIO_FROM_NUMBER", fromConfigured ? "configured" : "missing");

        boolean formatValid = fromConfigured && from.matches("^\\+[1-9]\\d{6,14}$");
        status.put("fromNumberFormatValid", formatValid);

        String alertSms = getAppAlertSmsEnabledStatus();
        status.put("APP_ALERT_SMS_ENABLED", alertSms);

        boolean available = isLiveSmsAvailable();
        status.put("isLiveSmsAvailable", available);

        List<String> missing = new ArrayList<>();
        if (!sidConfigured) missing.add("TWILIO_ACCOUNT_SID");
        if (!tokenConfigured) missing.add("TWILIO_AUTH_TOKEN");
        if (!fromConfigured) missing.add("TWILIO_FROM_NUMBER");
        if (!"true".equals(alertSms)) missing.add("APP_ALERT_SMS_ENABLED");
        status.put("missingOrUnsetVariables", missing);

        if (sidConfigured && tokenConfigured) {
            try {
                ensureTwilioInitialized();
                Account acct = Account.fetcher(sid).fetch();
                status.put("twilioApiReachable", true);
                status.put("twilioAccountStatus", acct != null && acct.getStatus() != null ? acct.getStatus().toString() : "ACTIVE");
            } catch (com.twilio.exception.ApiException e) {
                status.put("twilioApiReachable", false);
                status.put("twilioErrorCode", e.getCode());
                status.put("twilioErrorMessage", e.getMessage());
            } catch (Exception e) {
                status.put("twilioApiReachable", false);
                status.put("twilioErrorMessage", e.getMessage());
            }
        } else {
            status.put("twilioApiReachable", false);
            status.put("twilioReachabilityDetail", "Twilio credentials missing; cannot reach Twilio API");
        }

        return status;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) return "****";
        return phone.substring(0, Math.min(phone.length(), 6)) + "XXXX";
    }
}
