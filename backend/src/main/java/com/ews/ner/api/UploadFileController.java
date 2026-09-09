package com.ews.ner.api;

import com.ews.ner.infra.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
public class UploadFileController {

    private final FileStorageService fileStorage;

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveUpload(@PathVariable String filename) {
        try {
            Resource res = fileStorage.loadAsResource(filename);
            if (res == null) {
                return ResponseEntity.notFound().build();
            }

            String contentType = "image/jpeg";
            String lower = filename.toLowerCase();
            if (lower.endsWith(".png")) {
                contentType = "image/png";
            } else if (lower.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (lower.endsWith(".mp4")) {
                contentType = "video/mp4";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(res);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
