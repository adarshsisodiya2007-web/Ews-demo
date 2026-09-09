/**
 * SATARK AI Chatbot — Server-proxied Groq AI Assistant
 * Text + Speech In/Out | Disaster EWS Assistant | SIH 2026
 * Supports: Floating widget & Embedded in-page modes for Citizen & Responder
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { isCapacitorAndroid } from "../../utils/platform";
import { resolveApiBaseUrl } from "../../services/api";

const CITIZEN_SYSTEM_PROMPT = `You are SATARK Citizen AI Assistant — the life-safety companion for India's AI-Driven Landslide Early Warning System (EWS) for SIH 2026.
Your focus:
- Immediate physical safety and survival for citizens in landslide-prone hilly terrain (Wayanad, Meppadi, Guwahati, Shillong, Aizawl, Munnar, etc.)
- Explain risk scores clearly: GREEN (<0.40 safe), AMBER (0.40-0.70 be prepared), RED (>=0.70 evacuate now)
- Guide users to nearest designated relief shelters and safe detour routes (avoiding primary blockages)
- Explain how to use the Citizen Portal: Offline SOS Beacon (Tab 4), 3D Terrain view, audio sirens, peer-to-peer relay
- First aid and immediate survival steps: run perpendicular to slope displacement, never flee directly downhill into runoff channels
- Answer in Hindi, English, or mixed Hinglish depending on how the citizen asks. Keep answers urgent, concise, and life-protective.`;

const RESPONDER_SYSTEM_PROMPT = `You are SATARK Tactical Commander AI — the field operations tactical advisor for NDRF, SDRF, and District Disaster Management responders.
Your focus:
- Field rescue prioritization using AI Priority Matrix (TRAPPED_CITIZENS > INJURED_PEOPLE > BLOCKED_ROAD)
- BLE Rescue Scanner interpretation: RSSI >= -60dBm (~0-3m very close), -60 to -75dBm (3-10m close), < -75dBm (>10m distant)
- Real-time road status updating, heavy excavator routing, and evacuation corridor safety
- Offline sync queue protocols (IndexedDB local relay when cellular grid is down)
- Technical data interpretation: soil moisture saturation thresholds (>0.45 m3/m3 critical), rainfall 24h/72h triggers, NASADEM slope gradients (>25° high risk)
- Answer concisely with tactical bullet points in Hindi or English as preferred by the officer.`;

const GENERAL_SYSTEM_PROMPT = `You are SATARK AI — the intelligent assistant for India's AI-Driven Landslide Early Warning System (EWS) built for SIH 2026.
You assist both citizens and responders with landslide risks, evacuation procedures, sensor data, and app navigation. Answer clearly in Hindi or English.`;

const GROQ_DIRECT_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_DIRECT_MODEL = "groq/compound-mini";
const GROQ_DIRECT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export interface SatarkChatbotProps {
  mode?: "floating" | "embedded";
  roleContext?: "citizen" | "responder" | "general";
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: Date;
}

const CITIZEN_QUICK_Q = [
  "🏔️ Abhi landslide risk kya hai?",
  "🆘 Bina internet SOS kaise bhejein?",
  "🛣️ Safe evacuation route kaun sa hai?",
  "🏕️ Nearest verified relief camp kahan hai?",
  "🌧️ Red alert ka kya matlab hai?",
];

const RESPONDER_QUICK_Q = [
  "🚨 Trapped citizen report prioritize kaise karein?",
  "📡 BLE Scanner RSSI distance kaise interpret karein?",
  "🚧 Road status update & heavy detour protocol?",
  "🔄 Offline sync queue cloud me kab jayega?",
  "💧 Soil moisture saturation threshold kya hai?",
];

export const SatarkChatbot: React.FC<SatarkChatbotProps> = ({
  mode = "floating",
  roleContext = "general",
  onClose,
  className,
  style,
}) => {
  const isEmbedded = mode === "embedded";
  const [open, setOpen] = useState(isEmbedded);
  const [unread, setUnread] = useState(0);

  const initialWelcome =
    roleContext === "responder"
      ? "🎖️ **SATARK Tactical Commander AI**\n\nJai Hind, Officer! Main responder tactical advisor hoon. BLE beacon tracking, AI priority dispatch, road clearance, aur field protocol ke baare me puchein. 🇮🇳"
      : roleContext === "citizen"
      ? "🛰️ **SATARK Citizen Safety AI**\n\nNamaste! Main aapka disaster safety assistant hoon. Landslide risk, safe evacuation route, bina internet SOS, ya emergency shelter ke baare me kuch bhi puchein! 🙏"
      : "🛰️ **SATARK AI Disaster Assistant**\n\nNamaste! Main SATARK AI hoon — aapka disaster early warning assistant. Landslide risks, evacuation routes, SOS procedures, ya app usage ke baare mein kuch bhi puchein! 🙏";

  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      id: "0",
      role: "assistant",
      content: initialWelcome,
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [voiceOk, setVoiceOk] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false;
      r.interimResults = false;
      r.lang = "hi-IN";
      r.onresult = (e: any) => {
        const t = e.results[0][0].transcript;
        setInput((p) => (p ? `${p} ${t}` : t));
        setListening(false);
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recRef.current = r;
      setVoiceOk(true);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      setOpen(true);
      setUnread(0);
      if (e?.detail?.prompt) {
        setTimeout(() => sendMsg(e.detail.prompt), 200);
      } else {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };
    window.addEventListener("satark-open-chatbot", handleCustomOpen);
    return () => window.removeEventListener("satark-open-chatbot", handleCustomOpen);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsOn || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const plain = text
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/[🛰️🎖️🏔️🆘🛣️📱🌧️✅❌⚠️🚨🙏💧🌊🏕️🚧🔄📡]/gu, "")
        .slice(0, 450);
      const u = new SpeechSynthesisUtterance(plain);
      u.lang = "hi-IN";
      u.rate = 0.94;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [ttsOn]
  );

  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const currentSystemPrompt =
    roleContext === "responder"
      ? RESPONDER_SYSTEM_PROMPT
      : roleContext === "citizen"
      ? CITIZEN_SYSTEM_PROMPT
      : GENERAL_SYSTEM_PROMPT;

  const quickQuestions =
    roleContext === "responder"
      ? RESPONDER_QUICK_Q
      : roleContext === "citizen"
      ? CITIZEN_QUICK_Q
      : CITIZEN_QUICK_Q;

  const sendMsg = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        time: new Date(),
      };
      setMsgs((p) => [...p, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const history = msgs.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const messagesPayload = [
          { role: "system", content: currentSystemPrompt },
          ...history,
          { role: "user", content },
        ];

        let reply: string | null = null;

        // 1. Try Backend Proxy first
        try {
          const apiBase = resolveApiBaseUrl();
          const endpoint = `${apiBase}/api/v1/chatbot/chat`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: messagesPayload,
              max_tokens: 512,
              temperature: 0.7,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            reply =
              data?.choices?.[0]?.message?.content ||
              data?.reply ||
              data?.content ||
              null;
          }
        } catch {
          // Backend offline or unreachable — fallback to direct Groq API below
        }

        // 2. Direct Groq AI fallback (works 100% in Mobile APK and offline backend)
        if (!reply) {
          const groqRes = await fetch(GROQ_DIRECT_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_DIRECT_KEY}`,
            },
            body: JSON.stringify({
              model: GROQ_DIRECT_MODEL,
              messages: messagesPayload,
              max_tokens: 512,
              temperature: 0.7,
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            reply =
              groqData?.choices?.[0]?.message?.content ||
              groqData?.reply ||
              groqData?.content ||
              null;
          } else {
            const errData = await groqRes.json().catch(() => null);
            throw new Error(
              errData?.error?.message ||
              `AI Service error (HTTP ${groqRes.status})`
            );
          }
        }

        if (!reply) {
          throw new Error("No response choices returned by Groq AI.");
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          time: new Date(),
        };
        setMsgs((p) => [...p, aiMsg]);
        if (ttsOn) speak(reply);
        if (!open && !isEmbedded) setUnread((p) => p + 1);
      } catch (err: any) {
        const displayErr =
          err?.message ||
          "Network issue detect hua hai. Agar aap emergency mein hain toh Citizen Portal se SOS Beacon trigger karein ya National Helpline 1070 / 112 par call karein.";

        setMsgs((p) => [
          ...p,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `⚠️ ${displayErr}`,
            time: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, msgs, open, isEmbedded, speak, ttsOn, currentSystemPrompt]
  );

  const toggleListen = () => {
    if (!voiceOk) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    } else {
      try {
        recRef.current?.start();
        setListening(true);
      } catch {}
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const fmt = (t: string) =>
    t
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");

  const chatContainerStyle: React.CSSProperties = isEmbedded
    ? {
        width: "100%",
        height: "100%",
        minHeight: "560px",
        background: "#0a1124",
        border: "1px solid #1e3a5f",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        overflow: "hidden",
        fontFamily: "Inter,system-ui,sans-serif",
        ...style,
      }
    : {
        width: 380,
        height: 580,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 100px)",
        background: "#0f172a",
        border: "1px solid #1e3a5f",
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
        overflow: "hidden",
        fontFamily: "Inter,system-ui,sans-serif",
        ...style,
      };

  return (
    <>
      {/* Floating Mode Wrapper */}
      {!isEmbedded && (
        <div
          className={className}
          style={{
            position: "fixed",
            bottom: isCapacitorAndroid() ? "calc(76px + env(safe-area-inset-bottom, 0px))" : 24,
            right: 24,
            zIndex: 9999,
          }}
        >
          {/* Floating Trigger Button */}
          {!open && (
            <button
              onClick={handleOpen}
              title={
                roleContext === "responder"
                  ? "SATARK Tactical Commander AI"
                  : "SATARK AI Assistant"
              }
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background:
                  roleContext === "responder"
                    ? "linear-gradient(135deg,#059669,#047857)"
                    : "linear-gradient(135deg,#1e40af,#1d4ed8)",
                border:
                  roleContext === "responder"
                    ? "3px solid #34d399"
                    : "3px solid #60a5fa",
                color: "#fff",
                fontSize: "1.6rem",
                cursor: "pointer",
                boxShadow:
                  roleContext === "responder"
                    ? "0 8px 30px rgba(5,150,105,0.6)"
                    : "0 8px 30px rgba(29,78,216,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "transform .18s ease-in-out",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              {roleContext === "responder" ? "🎖️" : "🛰️"}
              {unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(239,68,68,0.7)",
                  }}
                >
                  {unread}
                </span>
              )}
            </button>
          )}

          {/* Floating Chat Window */}
          {open && (
            <div style={chatContainerStyle}>
              {/* Header */}
              <div
                style={{
                  background:
                    roleContext === "responder"
                      ? "linear-gradient(135deg,#064e3b,#0f172a)"
                      : "linear-gradient(135deg,#1e3a5f,#1e293b)",
                  borderBottom: "1px solid #1e3a5f",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background:
                        roleContext === "responder"
                          ? "linear-gradient(135deg,#10b981,#059669)"
                          : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      border:
                        roleContext === "responder"
                          ? "2px solid #34d399"
                          : "2px solid #3b82f6",
                    }}
                  >
                    {roleContext === "responder" ? "🎖️" : "🛰️"}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#f8fafc",
                        fontSize: "0.94rem",
                        letterSpacing: ".5px",
                      }}
                    >
                      {roleContext === "responder"
                        ? "TACTICAL AI"
                        : "SATARK AI"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color:
                          roleContext === "responder" ? "#34d399" : "#22c55e",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            roleContext === "responder" ? "#34d399" : "#22c55e",
                          display: "inline-block",
                        }}
                      />
                      {roleContext === "responder"
                        ? "NDRF/Field Tactical · Groq AI"
                        : "Disaster EWS Assistant · Groq AI"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => {
                      setTtsOn((p) => !p);
                      if (speaking) stopSpeak();
                    }}
                    title={ttsOn ? "Mute voice" : "Enable voice"}
                    style={{
                      background: ttsOn
                        ? "rgba(34,197,94,.12)"
                        : "rgba(100,116,139,.18)",
                      border: `1px solid ${ttsOn ? "#22c55e" : "#47556970"}`,
                      color: ttsOn ? "#22c55e" : "#94a3b8",
                      borderRadius: 6,
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                    }}
                  >
                    {ttsOn ? "🔊" : "🔇"}
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      stopSpeak();
                      onClose?.();
                    }}
                    style={{
                      background: "rgba(239,68,68,.12)",
                      border: "1px solid #ef444440",
                      color: "#f87171",
                      borderRadius: 6,
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "9px 13px",
                        borderRadius:
                          m.role === "user"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        background:
                          m.role === "user"
                            ? roleContext === "responder"
                              ? "linear-gradient(135deg,#059669,#047857)"
                              : "linear-gradient(135deg,#2563eb,#1d4ed8)"
                            : "rgba(30,41,59,.9)",
                        border:
                          m.role === "assistant"
                            ? "1px solid #1e3a5f"
                            : "none",
                        fontSize: "0.83rem",
                        lineHeight: 1.55,
                        color: "#f8fafc",
                      }}
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: fmt(m.content) }}
                      />
                      <div
                        style={{
                          fontSize: "0.62rem",
                          color: "rgba(255,255,255,.35)",
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 6,
                        }}
                      >
                        {m.time.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.role === "assistant" && (
                          <button
                            onClick={() => speak(m.content)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#60a5fa",
                              padding: 0,
                              fontSize: "0.7rem",
                            }}
                            title="Read aloud"
                          >
                            🔊
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        background: "rgba(30,41,59,.9)",
                        border: "1px solid #1e3a5f",
                        borderRadius: "16px 16px 16px 4px",
                        padding: "10px 16px",
                        display: "flex",
                        gap: 5,
                        alignItems: "center",
                      }}
                    >
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span
                          key={i}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background:
                              roleContext === "responder" ? "#10b981" : "#3b82f6",
                            display: "inline-block",
                            animation: `satark-bounce 1s ${d}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Quick Questions */}
              {msgs.length <= 2 && (
                <div
                  style={{
                    padding: "0 10px 8px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                  }}
                >
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMsg(q)}
                      style={{
                        background:
                          roleContext === "responder"
                            ? "rgba(16,185,129,.1)"
                            : "rgba(37,99,235,.1)",
                        border:
                          roleContext === "responder"
                            ? "1px solid rgba(16,185,129,.35)"
                            : "1px solid rgba(59,130,246,.28)",
                        color:
                          roleContext === "responder" ? "#6ee7b7" : "#93c5fd",
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: "0.71rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div
                style={{
                  borderTop: "1px solid #1e3a5f",
                  padding: "10px 10px",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  background: "#0b1329",
                }}
              >
                {voiceOk && (
                  <button
                    onClick={toggleListen}
                    title={listening ? "Stop" : "Voice input (Hindi/English)"}
                    style={{
                      width: 37,
                      height: 37,
                      borderRadius: "50%",
                      background: listening
                        ? "linear-gradient(135deg,#ef4444,#dc2626)"
                        : roleContext === "responder"
                        ? "rgba(16,185,129,.15)"
                        : "rgba(37,99,235,.14)",
                      border: `1px solid ${
                        listening
                          ? "#ef4444"
                          : roleContext === "responder"
                          ? "#10b98150"
                          : "#3b82f640"
                      }`,
                      color:
                        listening
                          ? "#fff"
                          : roleContext === "responder"
                          ? "#34d399"
                          : "#60a5fa",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      flexShrink: 0,
                      animation: listening ? "satark-pulse .9s infinite" : "none",
                    }}
                  >
                    {listening ? "⏹" : "🎤"}
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendMsg()
                  }
                  placeholder={
                    listening
                      ? "🎤 Listening… बोलें…"
                      : "Type or speak your question…"
                  }
                  style={{
                    flex: 1,
                    background: "rgba(30,41,59,.8)",
                    border: "1px solid #1e3a5f",
                    borderRadius: 20,
                    padding: "8px 14px",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => sendMsg()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 37,
                    height: 37,
                    borderRadius: "50%",
                    background:
                      input.trim() && !loading
                        ? roleContext === "responder"
                          ? "linear-gradient(135deg,#059669,#047857)"
                          : "linear-gradient(135deg,#2563eb,#1d4ed8)"
                        : "rgba(30,41,59,.45)",
                    border: "none",
                    color: "#fff",
                    cursor:
                      input.trim() && !loading ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                  }}
                >
                  {loading ? "⏳" : "➤"}
                </button>
              </div>

              {/* Speaking Indicator */}
              {speaking && (
                <div
                  style={{
                    background: "rgba(34,197,94,.08)",
                    borderTop: "1px solid #22c55e30",
                    padding: "4px 12px",
                    fontSize: "0.68rem",
                    color: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ animation: "satark-pulse .8s infinite" }}>
                    🔊
                  </span>
                  AI is speaking…
                  <button
                    onClick={stopSpeak}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f87171",
                      cursor: "pointer",
                      marginLeft: "auto",
                      fontSize: "0.68rem",
                    }}
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Embedded Mode */}
      {isEmbedded && (
        <div className={className} style={chatContainerStyle}>
          {/* Header */}
          <div
            style={{
              background:
                roleContext === "responder"
                  ? "linear-gradient(135deg,#064e3b,#0f172a)"
                  : "linear-gradient(135deg,#1e3a5f,#1e293b)",
              borderBottom: "1px solid #1e3a5f",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background:
                    roleContext === "responder"
                      ? "linear-gradient(135deg,#10b981,#059669)"
                      : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  border:
                    roleContext === "responder"
                      ? "2px solid #34d399"
                      : "2px solid #3b82f6",
                }}
              >
                {roleContext === "responder" ? "🎖️" : "🛰️"}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    color: "#f8fafc",
                    fontSize: "1.05rem",
                    letterSpacing: ".5px",
                  }}
                >
                  {roleContext === "responder"
                    ? "SATARK Tactical Commander AI"
                    : "SATARK Safety & Evacuation AI"}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: roleContext === "responder" ? "#34d399" : "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        roleContext === "responder" ? "#34d399" : "#22c55e",
                      display: "inline-block",
                    }}
                  />
                  {roleContext === "responder"
                    ? "NDRF Tactical Advisor · Speech & Text · Groq LLM"
                    : "Citizen Life Safety · Voice In/Out · Groq LLM"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => {
                  setTtsOn((p) => !p);
                  if (speaking) stopSpeak();
                }}
                title={ttsOn ? "Mute audio response" : "Enable audio response"}
                style={{
                  background: ttsOn
                    ? "rgba(34,197,94,.15)"
                    : "rgba(100,116,139,.2)",
                  border: `1px solid ${ttsOn ? "#22c55e" : "#475569"}`,
                  color: ttsOn ? "#22c55e" : "#94a3b8",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {ttsOn ? "🔊 Voice On" : "🔇 Voice Off"}
              </button>
            </div>
          </div>

          {/* Embedded Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {msgs.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "12px 16px",
                    borderRadius:
                      m.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    background:
                      m.role === "user"
                        ? roleContext === "responder"
                          ? "linear-gradient(135deg,#059669,#047857)"
                          : "linear-gradient(135deg,#2563eb,#1d4ed8)"
                        : "rgba(30,41,59,.92)",
                    border:
                      m.role === "assistant"
                        ? roleContext === "responder"
                          ? "1px solid rgba(16,185,129,.3)"
                          : "1px solid #1e3a5f"
                        : "none",
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    color: "#f8fafc",
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,.4)",
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    {m.time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.role === "assistant" && (
                      <button
                        onClick={() => speak(m.content)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#60a5fa",
                          padding: 0,
                          fontSize: "0.75rem",
                        }}
                        title="Read aloud"
                      >
                        🔊 Listen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "rgba(30,41,59,.9)",
                    border: "1px solid #1e3a5f",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "12px 20px",
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          roleContext === "responder" ? "#10b981" : "#3b82f6",
                        display: "inline-block",
                        animation: `satark-bounce 1s ${d}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Questions Strip */}
          <div
            style={{
              padding: "10px 18px",
              background: "rgba(15,23,42,.6)",
              borderTop: "1px solid rgba(30,58,95,.5)",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMsg(q)}
                style={{
                  background:
                    roleContext === "responder"
                      ? "rgba(16,185,129,.12)"
                      : "rgba(37,99,235,.12)",
                  border:
                    roleContext === "responder"
                      ? "1px solid rgba(16,185,129,.35)"
                      : "1px solid rgba(59,130,246,.3)",
                  color: roleContext === "responder" ? "#a7f3d0" : "#bfdbfe",
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "background .15s",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Embedded Input Bar */}
          <div
            style={{
              borderTop: "1px solid #1e3a5f",
              padding: "14px 18px",
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "#070d1e",
            }}
          >
            {voiceOk && (
              <button
                onClick={toggleListen}
                title={listening ? "Stop voice input" : "Speak (Hindi/English)"}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: listening
                    ? "linear-gradient(135deg,#ef4444,#dc2626)"
                    : roleContext === "responder"
                    ? "rgba(16,185,129,.18)"
                    : "rgba(37,99,235,.18)",
                  border: `1px solid ${
                    listening
                      ? "#ef4444"
                      : roleContext === "responder"
                      ? "#10b98160"
                      : "#3b82f660"
                  }`,
                  color:
                    listening
                      ? "#fff"
                      : roleContext === "responder"
                      ? "#34d399"
                      : "#60a5fa",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  flexShrink: 0,
                  animation: listening ? "satark-pulse .9s infinite" : "none",
                }}
              >
                {listening ? "⏹" : "🎤"}
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMsg()}
              placeholder={
                listening
                  ? "🎤 Listening… बोलें…"
                  : roleContext === "responder"
                  ? "Ask tactical questions, rescue procedures, road protocols..."
                  : "Type or speak your disaster safety question (Hindi/English)..."
              }
              style={{
                flex: 1,
                background: "rgba(30,41,59,.8)",
                border: "1px solid #1e3a5f",
                borderRadius: 24,
                padding: "11px 18px",
                color: "#f8fafc",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
            <button
              onClick={() => sendMsg()}
              disabled={!input.trim() || loading}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background:
                  input.trim() && !loading
                    ? roleContext === "responder"
                      ? "linear-gradient(135deg,#059669,#047857)"
                      : "linear-gradient(135deg,#2563eb,#1d4ed8)"
                    : "rgba(30,41,59,.45)",
                border: "none",
                color: "#fff",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                flexShrink: 0,
              }}
            >
              {loading ? "⏳" : "➤"}
            </button>
          </div>

          {/* Speaking Banner */}
          {speaking && (
            <div
              style={{
                background: "rgba(34,197,94,.1)",
                borderTop: "1px solid #22c55e40",
                padding: "6px 18px",
                fontSize: "0.75rem",
                color: "#22c55e",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ animation: "satark-pulse .8s infinite" }}>🔊</span>
              SATARK AI is speaking…
              <button
                onClick={stopSpeak}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f87171",
                  cursor: "pointer",
                  marginLeft: "auto",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes satark-bounce {
          0%,60%,100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes satark-pulse {
          0%,100% { opacity:1; }
          50% { opacity:.4; }
        }
      `}</style>
    </>
  );
};