package com.ews.ner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EarlyWarningApplication {
    public static void main(String[] args) {
        SpringApplication.run(EarlyWarningApplication.class, args);
    }
}
