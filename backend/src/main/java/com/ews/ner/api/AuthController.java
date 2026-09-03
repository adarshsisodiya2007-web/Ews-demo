package com.ews.ner.api;

import com.ews.ner.api.dto.LoginRequest;
import com.ews.ner.api.dto.LoginResponse;
import com.ews.ner.config.JwtUtil;
import com.ews.ner.domain.user.AppUser;
import com.ews.ner.domain.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AppUserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        AppUser user = userRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        
        if (!encoder.matches(req.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        
        return ResponseEntity.ok(LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole())
                .district(user.getDistrict())
                .languagePref(user.getLanguagePref())
                .expiresAt(OffsetDateTime.now().plusHours(10))
                .build());
    }
}
