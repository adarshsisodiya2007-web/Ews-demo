package com.ews.ner.api.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendOtpResponse {
    private boolean success;
    private String message;
    private boolean demoMode;
    private String demoOtp;
    private int cooldownSeconds;
}
