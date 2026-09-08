package com.ews.ner.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * SATARK AI Chatbot REST Controller
 * Proxies chatbot requests securely from the Citizen & Responder apps to Groq AI.
 * Keeps API keys on the server and strictly avoids frontend credential leakage.
 */
@RestController
@RequestMapping("/api/v1/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    private static final Logger log = LoggerFactory.getLogger(ChatbotController.class);

    @Value("${app.groq.api-key:${GROQ_API_KEY:}}")
    private String groqApiKey;

    @Value("${app.groq.model:${GROQ_MODEL:llama-3.3-70b-versatile}}")
    private String groqModel = "llama-3.3-70b-versatile";

    @Value("${app.groq.endpoint:https://api.groq.com/openai/v1/chat/completions}")
    private String groqEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> requestBody) {
        String apiKey = (groqApiKey != null && !groqApiKey.trim().isEmpty())
                ? groqApiKey.trim()
                : System.getenv("GROQ_API_KEY");

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("GROQ_API_KEY is not configured on the backend server.");
            Map<String, Object> err = new HashMap<>();
            err.put("error", "GROQ_API_KEY environment variable is not configured on the backend server.");
            err.put("status", "UNCONFIGURED_KEY");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(err);
        }

        String endpoint = (groqEndpoint != null && !groqEndpoint.trim().isEmpty())
                ? groqEndpoint.trim()
                : "https://api.groq.com/openai/v1/chat/completions";

        try {
            // Build OpenAI-compatible payload for Groq
            Map<String, Object> groqPayload = new HashMap<>();

            String model = (String) requestBody.getOrDefault("model", groqModel);
            // Translate legacy/invalid compound-mini to supported Groq LLM
            if (model == null || model.contains("compound-mini") || model.trim().isEmpty()) {
                model = (groqModel != null && !groqModel.isEmpty()) ? groqModel : "llama-3.3-70b-versatile";
            }
            groqPayload.put("model", model);

            Object messages = requestBody.get("messages");
            if (messages == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "messages array is required"));
            }
            groqPayload.put("messages", messages);
            groqPayload.put("max_tokens", requestBody.getOrDefault("max_tokens", 512));
            groqPayload.put("temperature", requestBody.getOrDefault("temperature", 0.7));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(groqPayload, headers);

            log.info("Forwarding chatbot request to Groq ({}) with model {}", endpoint, model);
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);

            return ResponseEntity.status(response.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());

        } catch (HttpStatusCodeException ex) {
            log.error("Groq API returned HTTP error: {} - {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            try {
                JsonNode errorJson = objectMapper.readTree(ex.getResponseBodyAsString());
                return ResponseEntity.status(ex.getStatusCode()).body(errorJson);
            } catch (Exception e) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "Groq API error: " + ex.getStatusCode());
                err.put("details", ex.getResponseBodyAsString());
                return ResponseEntity.status(ex.getStatusCode()).body(err);
            }
        } catch (Exception ex) {
            log.error("Unexpected error in Chatbot proxy: {}", ex.getMessage(), ex);
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to communicate with Groq AI service: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
