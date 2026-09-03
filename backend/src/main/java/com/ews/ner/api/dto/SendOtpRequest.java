package com.ews.ner.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendOtpRequest {
    @NotBlank(message = "Phone number is required")
    private String phone;
}
