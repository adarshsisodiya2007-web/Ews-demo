package com.ews.ner.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private List<String> allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/uploads/**", "/api/auth/**", "/api/risk/**", "/actuator/health", "/api/regions/**", "/api/v1/**", "/api/weather/**", "/api/alerts/**", "/ws/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reports", "/api/reports/", "/api/reports/upload").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reports/recent", "/api/reports/region/**", "/api/reports/beacons/**", "/api/reports/uploads/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/reports/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/reports/**").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL", "FIELD_OFFICER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reports/cleanup").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL", "FIELD_OFFICER")
                .requestMatchers("/api/citizen/alerts/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/responder/alerts/**").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL", "FIELD_OFFICER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/responder/alerts/**").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL", "FIELD_OFFICER")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/responder/alerts/**").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL", "FIELD_OFFICER")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/responder/alerts/**").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL", "FIELD_OFFICER")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/responder/alerts/**").hasAnyRole("ADMIN", "DISTRICT_OFFICIAL")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Use origins from application.yml — specific list for production security
        config.setAllowedOriginPatterns(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
