package com.ews.ner.domain.user;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name="app_user")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AppUser implements UserDetails {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String username;
    private String email;
    private String passwordHash;
    
    @Column(unique = true)
    private String phone;
    
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "user_role_enum")
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private UserRole role;
    
    private String district;
    
    @Builder.Default
    private String languagePref = "en";
    
    @Builder.Default
    private boolean active = true;
    
    private OffsetDateTime createdAt;

    public enum UserRole { ADMIN, DISTRICT_OFFICIAL, FIELD_OFFICER, CITIZEN }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() { return passwordHash; }
    @Override
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() { return active; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return active; }
}
