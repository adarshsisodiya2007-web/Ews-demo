package com.ews.ner.engine;

public record FactorScore(double score, double weight, double contribution, String label) {
    public static FactorScore of(double score, double weight, String label) {
        return new FactorScore(score, weight, score * weight, label);
    }
}
