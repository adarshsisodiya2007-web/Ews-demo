package com.ews.ner.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpRequest {
    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "OTP is required")
    private String otp;
}
