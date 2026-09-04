package com.satark.ews;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private boolean ttsInitialized = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize Native Android TextToSpeech engine
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("hi", "IN"));
                ttsInitialized = true;
            }
        });

        // Configure WebView settings for audio and bridge
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // Bypass user gesture requirement for Web Audio API / HTML5 Audio
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            // Register native TTS Javascript bridge: window.AndroidTTS
            webView.addJavascriptInterface(new AndroidTTSBridge(), "AndroidTTS");
        }
    }

    public class AndroidTTSBridge {
        @JavascriptInterface
        public void speak(String text, String langCode) {
            if (tts == null || !ttsInitialized || text == null || text.trim().isEmpty()) {
                return;
            }

            try {
                Locale targetLocale;
                if (langCode != null && langCode.toLowerCase().startsWith("hi")) {
                    targetLocale = new Locale("hi", "IN");
                } else if (langCode != null && langCode.toLowerCase().startsWith("as")) {
                    // Try Assamese locale, fallback to hi-IN if unavailable
                    Locale asLocale = new Locale("as", "IN");
                    int res = tts.isLanguageAvailable(asLocale);
                    if (res >= TextToSpeech.LANG_AVAILABLE) {
                        targetLocale = asLocale;
                    } else {
                        targetLocale = new Locale("hi", "IN");
                    }
                } else {
                    targetLocale = Locale.ENGLISH;
                }

                tts.setLanguage(targetLocale);
                tts.setSpeechRate(0.95f);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "SATARK_TTS_UTTERANCE");
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null) {
                try {
                    tts.stop();
                } catch (Exception ignored) {
                }
            }
        }

        @JavascriptInterface
        public boolean isSpeaking() {
            return tts != null && tts.isSpeaking();
        }

        @JavascriptInterface
        public boolean isAvailable() {
            return ttsInitialized;
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }
}
