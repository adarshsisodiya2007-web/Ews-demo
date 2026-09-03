package com.ews.ner.engine;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Configuration
@ConfigurationProperties(prefix = "app.risk.weights")
@Validated
@Data
public class RiskWeights {
    private double rainfall = 0.35;
    private double soilMoisture = 0.25;
    private double slope = 0.20;
    private double history = 0.12;
    private double citizenReports = 0.08;
    
    @PostConstruct
    public void validate() {
        double sum = rainfall + soilMoisture + slope + history + citizenReports;
        if (Math.abs(sum - 1.0) > 0.001) throw new IllegalStateException("Risk weights must sum to 1.0, got: " + sum);
    }
}
