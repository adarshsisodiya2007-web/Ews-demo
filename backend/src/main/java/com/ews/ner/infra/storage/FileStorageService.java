package com.ews.ner.infra.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.GetObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    @Value("${app.minio.endpoint:http://localhost:9000}")
    private String minioEndpoint;

    @Value("${app.minio.access-key:ews_minio_user}")
    private String minioAccessKey;

    @Value("${app.minio.secret-key:ews_minio_pass}")
    private String minioSecretKey;

    @Value("${app.minio.bucket:ews-uploads}")
    private String minioBucket;

    private final Path fallbackDir = Paths.get(System.getProperty("java.io.tmpdir"), "ews-uploads");
    private MinioClient minioClient = null;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(fallbackDir);
        } catch (Exception e) {
            log.warn("Could not create local fallback directory", e);
        }

        try {
            MinioClient client = MinioClient.builder()
                    .endpoint(minioEndpoint)
                    .credentials(minioAccessKey, minioSecretKey)
                    .build();

            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(minioBucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(minioBucket).build());
                log.info("Created MinIO bucket: {}", minioBucket);
            }
            this.minioClient = client;
            log.info("MinIO object storage initialized successfully at {}", minioEndpoint);
        } catch (Exception e) {
            log.info("MinIO unavailable ({}), using local persistent storage directory: {}", e.getMessage(), fallbackDir);
            this.minioClient = null;
        }
    }

    public String store(MultipartFile file, String folder) {
        try {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "evidence.jpg";
            String cleanName = Paths.get(originalName).getFileName().toString();
            String filename = UUID.randomUUID().toString() + "_" + cleanName;

            Path targetLocation = fallbackDir.resolve(filename);
            file.transferTo(targetLocation.toFile());

            if (minioClient != null) {
                try (InputStream is = Files.newInputStream(targetLocation)) {
                    minioClient.putObject(
                            PutObjectArgs.builder()
                                    .bucket(minioBucket)
                                    .object(filename)
                                    .stream(is, file.getSize(), -1)
                                    .contentType(file.getContentType() != null ? file.getContentType() : "image/jpeg")
                                    .build()
                    );
                    log.info("Uploaded object to MinIO bucket {}: {}", minioBucket, filename);
                } catch (Exception mEx) {
                    log.warn("Failed to replicate upload to MinIO, preserved in local storage: {}", mEx.getMessage());
                }
            }

            return "/uploads/" + filename;
        } catch (Exception ex) {
            log.error("Could not store evidence file {}", file.getOriginalFilename(), ex);
            throw new RuntimeException("Could not store file " + file.getOriginalFilename(), ex);
        }
    }

    public Resource loadAsResource(String filename) {
        try {
            String sanitized = Paths.get(filename).getFileName().toString();
            Path filePath = fallbackDir.resolve(sanitized).normalize();

            if (Files.exists(filePath) && Files.isReadable(filePath)) {
                return new FileSystemResource(filePath);
            }

            if (minioClient != null) {
                try {
                    InputStream is = minioClient.getObject(
                            GetObjectArgs.builder()
                                    .bucket(minioBucket)
                                    .object(sanitized)
                                    .build()
                    );
                    return new InputStreamResource(is);
                } catch (Exception mEx) {
                    log.warn("File {} not found in MinIO bucket", sanitized);
                }
            }
            return null;
        } catch (Exception e) {
            log.warn("Error loading resource {}: {}", filename, e.getMessage());
            return null;
        }
    }

    public boolean deleteFile(String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) return false;
        try {
            String filename = photoUrl;
            int lastSlash = filename.lastIndexOf('/');
            if (lastSlash >= 0) {
                filename = filename.substring(lastSlash + 1);
            }
            String sanitized = Paths.get(filename).getFileName().toString();

            boolean deletedLocal = false;
            Path localPath = fallbackDir.resolve(sanitized).normalize();
            if (Files.exists(localPath)) {
                deletedLocal = Files.deleteIfExists(localPath);
            }

            if (minioClient != null) {
                try {
                    minioClient.removeObject(
                            RemoveObjectArgs.builder()
                                    .bucket(minioBucket)
                                    .object(sanitized)
                                    .build()
                    );
                } catch (Exception mEx) {
                    log.warn("Failed to delete object from MinIO: {}", mEx.getMessage());
                }
            }

            log.info("Deleted evidence photo: {}", sanitized);
            return deletedLocal;
        } catch (Exception e) {
            log.warn("Error deleting evidence photo {}: {}", photoUrl, e.getMessage());
            return false;
        }
    }
}
