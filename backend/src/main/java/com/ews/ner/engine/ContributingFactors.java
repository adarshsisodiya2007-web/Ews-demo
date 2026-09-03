package com.ews.ner.engine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ContributingFactors {
    private FactorScore rainfall;
    private FactorScore soilMoisture;
    private FactorScore slope;
    private FactorScore history;
    private FactorScore citizenReports;
    
    public double totalScore() {
        return rainfall.contribution() + soilMoisture.contribution() 
             + slope.contribution() + history.contribution() 
             + citizenReports.contribution();
    }
    
    public String toSmsSummary() {
        return String.format("Rain:%.0f%% Soil:%.0f%% Slope:%.0f%% Reports:%.0f%%",
            rainfall.score()*100, soilMoisture.score()*100, 
            slope.score()*100, citizenReports.score()*100);
    }
}
