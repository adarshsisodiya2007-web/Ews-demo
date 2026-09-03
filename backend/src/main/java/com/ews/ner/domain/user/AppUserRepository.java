package com.ews.ner.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByPhone(String phone);
}
