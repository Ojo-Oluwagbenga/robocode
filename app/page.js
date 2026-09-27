"use client";

import { useState, useEffect } from "react";
import { INITIAL_BIO_DATA, INITIAL_PI_INSTRUCTIONS } from "@/lib/default_db";

const DEFAULT_DB_STATE = {
  database_provider: "Local Database Mode (Add FIREBASE_DATABASE_URL in Vercel to sync with Google RealtimeDB)",
  firebase_connected: false,
  bio_data: INITIAL_BIO_DATA,
  pi_instructions: [...INITIAL_PI_INSTRUCTIONS],
};

export default function Home() {
  const [dbData, setDbData] = useState(DEFAULT_DB_STATE);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState("formatted"); // "formatted" | "raw_json"

  // Test form state
  const [testCode, setTestCode] = useState("NOD_UP");
  const [testValue, setTestValue] = useState("30");
  const [sendResult, setSendResult] = useState(null);
  const [sending, setSending] = useState(false);

  // Fetch full DB data
  const fetchDb = async () => {
    try {
      const res = await fetch("/api/db", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDbData(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error("Failed to fetch database:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDb();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDb();
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Test sending a GET request just like Gemini would
  const handleSendTestGet = async (e) => {
    e?.preventDefault();
    if (!testCode) return;
    setSending(true);
    setSendResult(null);

    const url = `/api/instruct?code=${encodeURIComponent(testCode)}&value=${encodeURIComponent(testValue)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      const result = await res.json();
      setSendResult({
        url,
        status: res.status,
        response: result,
      });
      // Refresh DB immediately
      await fetchDb();
    } catch (err) {
      setSendResult({
        url,
        status: "error",
        response: { error: err.message },
      });
    } finally {
      setSending(false);
    }
  };

  // Simulate Pi acknowledging an instruction
  const handleAck = async (id) => {
    try {
      await fetch(`/api/pi_instructions?ack=${id}&status=executed`);
      await fetchDb();
    } catch (err) {
      console.error("Ack failed:", err);
    }
  };

  // Clear instructions
  const handleClear = async () => {
    if (!confirm("Clear all pi_instructions entries?")) return;
    try {
      await fetch("/api/pi_instructions?clear=true");
      await fetchDb();
    } catch (err) {
      console.error("Clear failed:", err);
    }
  };

  const bio = dbData?.bio_data || {};
  const instructions = dbData?.pi_instructions || [];
  const codesList = Array.isArray(bio.codes) ? bio.codes : [];

  return (
    <main style={{ padding: "20px 24px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header Bar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "16px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-green)", letterSpacing: "0.5px" }}>
            [ROBOT BRIDGE DATABASE]
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "4px" }}>
            Realtime DB Bridge between Gemini Live and Raspberry Pi Controller
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              background: dbData?.firebase_connected ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: dbData?.firebase_connected ? "var(--accent-green)" : "var(--accent-amber)",
              border: `1px solid ${dbData?.firebase_connected ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
            }}
          >
            ● {dbData?.firebase_connected ? "Google RealtimeDB: CONNECTED" : "DB Mode: LOCAL CACHE"}
          </span>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? "#164e63" : "#1f2937",
              color: autoRefresh ? "#38bdf8" : "#9ca3af",
              border: "1px solid var(--border-color)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            {autoRefresh ? "Auto-Sync: ON (2s)" : "Auto-Sync: PAUSED"}
          </button>

          <button
            onClick={fetchDb}
            style={{
              background: "#1f2937",
              color: "#e5e7eb",
              border: "1px solid var(--border-color)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            Refresh Now
          </button>

          <button
            onClick={() => setViewMode(viewMode === "formatted" ? "raw_json" : "formatted")}
            style={{
              background: "#111827",
              color: "var(--accent-cyan)",
              border: "1px solid var(--border-color)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            View: {viewMode === "formatted" ? "Raw JSON" : "Formatted Text"}
          </button>
        </div>
      </header>

      {/* Direct API Endpoints Quickbar */}
      <section
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "12px 16px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "12px",
        }}
      >
        <span style={{ color: "var(--text-dim)" }}>API Endpoints:</span>
        <a href="/bio_data" target="_blank" rel="noopener noreferrer">
          <code>GET /bio_data</code>
        </a>
        <a href="/bio_data?format=text" target="_blank" rel="noopener noreferrer">
          <code>GET /bio_data?format=text</code>
        </a>
        <a href="/instruct?code=NOD_UP&value=30" target="_blank" rel="noopener noreferrer">
          <code>GET /instruct?code=...&value=...</code>
        </a>
        <a href="/pi_instructions" target="_blank" rel="noopener noreferrer">
          <code>GET /pi_instructions</code>
        </a>
        <a href="/raw" target="_blank" rel="noopener noreferrer">
          <code>GET /raw (Full DB Text)</code>
        </a>
        <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "11px" }}>
          Last updated: {lastUpdated || "loading..."}
        </span>
      </section>

      {/* Live Gemini GET Request Test Bar */}
      <section
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "13px", color: "var(--accent-cyan)", textTransform: "uppercase" }}>
            &gt; TEST GEMINI GET REQUEST TRIGGER
          </h2>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            Simulates the exact GET request Gemini issues during dialogue
          </span>
        </div>

        <form
          onSubmit={handleSendTestGet}
          style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ color: "var(--text-dim)", fontSize: "12px" }}>Code:</label>
            <select
              value={testCode}
              onChange={(e) => {
                setTestCode(e.target.value);
                const match = codesList.find((c) => c.code === e.target.value);
                if (match?.example_value) setTestValue(match.example_value);
              }}
              style={{ minWidth: "160px" }}
            >
              {codesList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.meaning})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ color: "var(--text-dim)", fontSize: "12px" }}>Value:</label>
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="e.g. 30"
              style={{ width: "120px" }}
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            style={{
              background: "var(--accent-green)",
              color: "#000",
              fontWeight: "600",
              border: "none",
              padding: "6px 16px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            {sending ? "Sending..." : "Send GET Request"}
          </button>

          <span style={{ color: "var(--text-dim)", fontSize: "12px", marginLeft: "8px" }}>
            Request: <code>GET /api/instruct?code={testCode}&value={testValue}</code>
          </span>
        </form>

        {sendResult && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "#080c10",
              border: "1px solid #1e293b",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "var(--accent-green)" }}>✓ Response ({sendResult.status}):</span>
            <pre style={{ margin: "4px 0 0 0", color: "#94a3b8", overflowX: "auto" }}>
              {JSON.stringify(sendResult.response, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Main Database Content Grid */}
      {viewMode === "raw_json" ? (
        /* RAW JSON VIEW */
        <section
          style={{
            background: "#080c10",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <h2 style={{ fontSize: "13px", color: "var(--accent-amber)" }}>[FULL DATABASE RAW JSON TEXT]</h2>
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(dbData, null, 2))}
              style={{
                background: "#1f2937",
                color: "#e5e7eb",
                border: "1px solid var(--border-color)",
                padding: "3px 8px",
                borderRadius: "3px",
                fontSize: "11px",
              }}
            >
              Copy JSON
            </button>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              color: "#38bdf8",
              fontSize: "12px",
              lineHeight: "1.4",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            {JSON.stringify(dbData, null, 2)}
          </pre>
        </section>
      ) : (
        /* FORMATTED TEXT VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          {/* Section: PI INSTRUCTIONS (The Live Queue) */}
          <section
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "12px",
                marginBottom: "14px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "14px", color: "var(--accent-amber)", fontWeight: "600" }}>
                  [ENTRY: pi_instructions] ({instructions.length} entries, {instructions.filter(i => i.status === "pending").length} pending)
                </h2>
                <p style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "2px" }}>
                  Raspberry Pi listens to this node to receive command packets dispatched by Gemini.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleClear}
                  style={{
                    background: "#271c1c",
                    color: "var(--accent-red)",
                    border: "1px solid #451a1a",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                  }}
                >
                  Clear Queue
                </button>
              </div>
            </div>

            {instructions.length === 0 ? (
              <p style={{ color: "var(--text-dim)", fontStyle: "italic", padding: "16px 0" }}>
                No instructions in queue. Send a GET request above or from Gemini to add an entry.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b", color: "var(--text-dim)" }}>
                      <th style={{ padding: "8px 10px" }}>TIME</th>
                      <th style={{ padding: "8px 10px" }}>CODE</th>
                      <th style={{ padding: "8px 10px" }}>VALUE</th>
                      <th style={{ padding: "8px 10px" }}>MEANING</th>
                      <th style={{ padding: "8px 10px" }}>TARGET HARDWARE</th>
                      <th style={{ padding: "8px 10px" }}>STATUS</th>
                      <th style={{ padding: "8px 10px" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instructions.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid #161e2e",
                          background: item.status === "pending" ? "rgba(245, 158, 11, 0.05)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "8px 10px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "-"}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: "700", color: "var(--accent-cyan)" }}>
                          {item.code}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#f3f4f6" }}>
                          <code>{item.value}</code>
                        </td>
                        <td style={{ padding: "8px 10px", color: "#cbd5e1" }}>
                          {item.meaning || item.action_description || "-"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-dim)", fontSize: "11px" }}>
                          {item.hardware || "ESP32"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "3px",
                              fontSize: "10px",
                              textTransform: "uppercase",
                              fontWeight: "600",
                              background: item.status === "pending" ? "#451a03" : "#064e3b",
                              color: item.status === "pending" ? "#fde047" : "#6ee7b7",
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {item.status === "pending" ? (
                            <button
                              onClick={() => handleAck(item.id)}
                              style={{
                                background: "#1e293b",
                                color: "#93c5fd",
                                border: "1px solid #334155",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                fontSize: "10px",
                              }}
                            >
                              Mark Executed
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>✓ done</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section: BIO DATA (Identity, Personality, Codes, Instructions) */}
          <section
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "14px", color: "var(--accent-green)", fontWeight: "600" }}>
                  [ENTRY: bio_data]
                </h2>
                <p style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "2px" }}>
                  Read by Gemini when connecting to learn its persona, context, valid codes, and trigger rules.
                </p>
              </div>

              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(bio, null, 2))}
                style={{
                  background: "#1f2937",
                  color: "#e5e7eb",
                  border: "1px solid var(--border-color)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
              >
                Copy bio_data
              </button>
            </div>

            {/* Sub-grid for Personality and Context */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {/* Personality Box */}
              <div
                style={{
                  background: "#080c10",
                  border: "1px solid #1a2230",
                  borderRadius: "4px",
                  padding: "14px",
                }}
              >
                <h3 style={{ fontSize: "12px", color: "var(--accent-cyan)", marginBottom: "8px" }}>
                  [PERSONALITY & PERSONA]
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Name: </span>
                    <span style={{ color: "#fff", fontWeight: "600" }}>{bio.personality?.name}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Role: </span>
                    <span style={{ color: "#cbd5e1" }}>{bio.personality?.role}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Tone: </span>
                    <span style={{ color: "#cbd5e1" }}>{bio.personality?.tone}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Embodiment: </span>
                    <span style={{ color: "#cbd5e1" }}>{bio.personality?.embodiment}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Speech Rules: </span>
                    <span style={{ color: "var(--accent-amber)" }}>{bio.personality?.speech_rules}</span>
                  </div>
                </div>
              </div>

              {/* Context Values Box */}
              <div
                style={{
                  background: "#080c10",
                  border: "1px solid #1a2230",
                  borderRadius: "4px",
                  padding: "14px",
                }}
              >
                <h3 style={{ fontSize: "12px", color: "var(--accent-cyan)", marginBottom: "8px" }}>
                  [CONTEXT VALUES]
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Active User: </span>
                    <span style={{ color: "#fff", fontWeight: "600" }}>{bio.context_values?.active_user}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Location: </span>
                    <span style={{ color: "#cbd5e1" }}>{bio.context_values?.current_location}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Active Mode: </span>
                    <span style={{ color: "var(--accent-green)" }}>{bio.context_values?.active_mode}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>System Status: </span>
                    <span style={{ color: "var(--accent-green)" }}>{bio.context_values?.system_status}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Current Activity: </span>
                    <span style={{ color: "#cbd5e1" }}>{bio.context_values?.current_activity}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Allowed Codes & Meaning Table */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "12px", color: "var(--accent-cyan)", marginBottom: "10px" }}>
                [ALLOWED CODES & HARDWARE MEANINGS] ({codesList.length} defined codes)
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b", color: "var(--text-dim)" }}>
                      <th style={{ padding: "6px 8px" }}>CODE</th>
                      <th style={{ padding: "6px 8px" }}>PHYSICAL MEANING</th>
                      <th style={{ padding: "6px 8px" }}>HARDWARE MAPPING</th>
                      <th style={{ padding: "6px 8px" }}>EXAMPLE VALUE</th>
                      <th style={{ padding: "6px 8px" }}>DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codesList.map((c) => (
                      <tr key={c.code} style={{ borderBottom: "1px solid #161e2e" }}>
                        <td style={{ padding: "8px", fontWeight: "700", color: "var(--accent-green)" }}>
                          <code>{c.code}</code>
                        </td>
                        <td style={{ padding: "8px", color: "#f3f4f6" }}>{c.meaning}</td>
                        <td style={{ padding: "8px", color: "var(--text-dim)", fontSize: "11px" }}>{c.hardware}</td>
                        <td style={{ padding: "8px", color: "var(--accent-cyan)" }}>
                          <code>{c.example_value}</code>
                        </td>
                        <td style={{ padding: "8px", color: "#9ca3af", fontSize: "11px" }}>{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instructions for Gemini */}
            <div
              style={{
                background: "#080c10",
                border: "1px solid #1e293b",
                borderRadius: "4px",
                padding: "14px",
              }}
            >
              <h3 style={{ fontSize: "12px", color: "var(--accent-amber)", marginBottom: "6px" }}>
                [GEMINI GET INSTRUCTION PROTOCOL]
              </h3>
              <p style={{ color: "#cbd5e1", fontSize: "12px", marginBottom: "8px" }}>
                {bio.gemini_instructions?.instruction_rule}
              </p>
              <div style={{ display: "flex", gap: "20px", fontSize: "11px", color: "var(--text-dim)", marginBottom: "12px" }}>
                <div>Method: <strong style={{ color: "var(--accent-green)" }}>{bio.gemini_instructions?.method}</strong></div>
                <div>Endpoint: <strong style={{ color: "var(--accent-cyan)" }}>{bio.gemini_instructions?.endpoint}</strong></div>
              </div>

              <div style={{ fontSize: "11px" }}>
                <span style={{ color: "var(--text-dim)" }}>Example Conversation Scenarios:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  {bio.gemini_instructions?.examples?.map((ex, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "6px 8px",
                        background: "#0d131a",
                        borderLeft: "3px solid var(--accent-cyan)",
                        borderRadius: "2px",
                      }}
                    >
                      <div style={{ color: "#93c5fd" }}>"{ex.conversation_trigger}"</div>
                      <div style={{ color: "var(--accent-green)", margin: "2px 0" }}>
                        <code>➔ {ex.gemini_get_request}</code>
                      </div>
                      <div style={{ color: "#9ca3af", fontStyle: "italic" }}>Spoken voice: "{ex.gemini_spoken_reply}"</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "32px",
          borderTop: "1px solid var(--border-color)",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          color: "var(--text-dim)",
          fontSize: "11px",
        }}
      >
        <div>
          Nova Humanoid Companion Bridge &bull; Ready for Vercel Deployment &bull; Realtime DB Integration
        </div>
        <div>
          Hosting: Vercel &bull; Protocol: HTTP GET / REST
        </div>
      </footer>
    </main>
  );
}
