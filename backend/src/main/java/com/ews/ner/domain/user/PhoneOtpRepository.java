package com.ews.ner.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhoneOtpRepository extends JpaRepository<PhoneOtp, UUID> {
    List<PhoneOtp> findByPhoneOrderByCreatedAtDesc(String phone);
    Optional<PhoneOtp> findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(String phone);
    void deleteByPhone(String phone);
}
