package com.ews.ner.domain.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "phone_otp")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhoneOtp {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "otp_hash", nullable = false)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Builder.Default
    @Column(nullable = false)
    private int attempts = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
