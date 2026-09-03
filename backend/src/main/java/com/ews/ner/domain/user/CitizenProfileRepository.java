package com.ews.ner.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface CitizenProfileRepository extends JpaRepository<CitizenProfile, UUID> {
    Optional<CitizenProfile> findByUserId(UUID userId);
    void deleteByUserId(UUID userId);
}
