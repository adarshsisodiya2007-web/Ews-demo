package com.ews.ner.infra.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {
    private final Path fallbackDir = Paths.get(System.getProperty("java.io.tmpdir"), "ews-uploads");

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(fallbackDir);
        } catch (Exception e) {
            log.warn("Could not create fallback directory", e);
        }
    }

    public String store(MultipartFile file, String folder) {
        try {
            String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path targetLocation = fallbackDir.resolve(filename);
            file.transferTo(targetLocation.toFile());
            return "/uploads/" + filename; // Public URL Mock
        } catch (Exception ex) {
            throw new RuntimeException("Could not store file " + file.getOriginalFilename(), ex);
        }
    }
}
