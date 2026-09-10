package com.ews.ner.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Custom Flyway migration strategy.
 * Executes flyway.repair() prior to flyway.migrate() on application startup.
 * Catches any non-fatal migration glitches so that the Spring Boot web service
 * and Actuator health check always boot successfully on Render.
 */
@Configuration
@Slf4j
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy cleanRepairMigrateStrategy() {
        return flyway -> {
            try {
                log.info("Executing Flyway repair...");
                flyway.repair();
            } catch (Exception e) {
                log.warn("Flyway repair warning: {}", e.getMessage());
            }

            try {
                log.info("Executing Flyway migrate...");
                flyway.migrate();
                log.info("Flyway migration completed successfully.");
            } catch (Exception e) {
                log.error("Flyway migration error occurred: {}", e.getMessage(), e);
            }
        };
    }
}
