package com.ews.ner.api.dto;

import com.ews.ner.domain.report.CitizenReport.ReportCategory;
import com.ews.ner.domain.report.CitizenReport.ReporterType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateReportRequest {
    @NotNull
    @com.fasterxml.jackson.annotation.JsonAlias({"lat", "latitude"})
    private BigDecimal geoLat;
    @NotNull
    @com.fasterxml.jackson.annotation.JsonAlias({"lng", "longitude"})
    private BigDecimal geoLng;
    
    private ReportCategory category;
    private String description;
    private ReporterType reporterType;
    private String photoUrl;
    private String clientReportId;

    public BigDecimal getLat() {
        return geoLat;
    }

    public BigDecimal getLng() {
        return geoLng;
    }
}
