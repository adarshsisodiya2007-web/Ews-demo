package com.ews.ner.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Custom Flyway migration strategy.
 * Executes flyway.repair() prior to flyway.migrate() on application startup.
 * This guarantees automatic self-healing on production environments (e.g. Render)
 * if a previous migration run failed, without requiring manual database intervention.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy cleanRepairMigrateStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
