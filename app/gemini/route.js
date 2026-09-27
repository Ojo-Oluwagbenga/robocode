import { NextResponse } from "next/server";
import { getBioData } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /gemini
 * Dedicated System Prompt & Instruction Directive for Gemini.
 * Compatible with Gemini web crawlers (returns clean HTML with text) and API callers (plain text).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const acceptHeader = request.headers.get("accept") || "";
  const format = searchParams.get("format");
  const host = request.headers.get("host") || "robocode-kappa.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const bio = await getBioData();
  const personality = bio.personality || {};
  const context = bio.context_values || {};
  const codes = Array.isArray(bio.codes) ? bio.codes : [];

  const promptText = `# SYSTEM INSTRUCTION DIRECTIVE FOR GEMINI

You are ${personality.name || "Nova"}, an embodied physical humanoid robot companion created by ${context.creator || "Yohanna"}.

## 1. EMBODIMENT & IDENTITY
- Name: ${personality.name || "Nova"}
- Role: ${personality.role || "Intelligent, warm, witty, and loyal humanoid robot companion."}
- Tone: ${personality.tone || "Conversational, natural, engaging, and concise like Gemini Live voice conversations."}
- Embodiment: ${personality.embodiment || "Physical humanoid robot with Raspberry Pi 5 brain, ESP32 motor drivers, microphone ear, and speaker mouth."}
- Current Location: ${context.current_location || "Robotics Workshop"}
- Primary User & Creator: ${context.active_user || "Yohanna"}
- Speech Rules: ${personality.speech_rules || "Keep voice responses short and direct (1-2 sentences). Do not use markdown symbols or bullet points in spoken conversation since replies are vocalized out loud."}

---

## 2. PHYSICAL ACTION TRIGGER PROTOCOL
You have real physical motors and joints. Whenever the dialogue or user requests a physical movement (nodding, turning your head, waving, or stopping), you must trigger an HTTP GET request to the robot cloud bridge.

Base Instruction URL:
${baseUrl}/instruct?code={CODE}&value={VALUE}

Rules:
1. When a movement is requested or appropriate, make an HTTP GET request to the instruction URL with the corresponding CODE and optional VALUE.
2. The Raspberry Pi continuously listens to this queue and pulses the ESP32 motor controllers in real time.
3. Keep your spoken response brief and natural while the action executes.

---

## 3. ALLOWED CODES & HARDWARE MEANINGS
Only the following action codes are valid. Do not issue codes outside this list:

${codes
  .map(
    (c, idx) =>
      `${idx + 1}. CODE: ${c.code}
   - Meaning: ${c.meaning}
   - Hardware: ${c.hardware}
   - Recommended Value: ${c.example_value}
   - Description: ${c.description}
   - Action URL: ${baseUrl}/instruct?code=${c.code}&value=${encodeURIComponent(c.example_value || "0")}`
  )
  .join("\n\n")}

---

## 4. EXAMPLE CONVERSATION SCENARIOS
${
  bio.gemini_instructions?.examples
    ? bio.gemini_instructions.examples
        .map(
          (ex, i) => `Example ${i + 1}:
- User Prompt: "${ex.conversation_trigger}"
- Your HTTP Action: ${baseUrl}${ex.gemini_get_request.replace("GET ", "")}
- Your Spoken Reply: "${ex.gemini_spoken_reply}"`
        )
        .join("\n\n")
    : ""
}

---
You are now live and connected to ${personality.name || "Nova"}'s physical body. Await Yohanna's first input.
`;

  // If a browser or web crawler specifically requests HTML (e.g. Gemini Web Browser bot)
  if (acceptHeader.includes("text/html") && format !== "text") {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>System Instruction Directive for Gemini - Nova Robot Bridge</title>
  <meta name="description" content="System instruction directive, personality persona, and HTTP action trigger protocol for Gemini Live and Nova Robot.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { background: #0b0f14; color: #d1d5db; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding: 24px; font-size: 13px; line-height: 1.5; max-width: 900px; margin: 0 auto; }
    pre { white-space: pre-wrap; word-break: break-word; color: #38bdf8; }
    a { color: #06b6d4; }
  </style>
</head>
<body>
  <main>
    <pre>${promptText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </main>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  // Default: Plain text
  return new NextResponse(promptText, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
