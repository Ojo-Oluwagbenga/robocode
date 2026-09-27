import { NextResponse } from "next/server";
import { getBioData, setBioData } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/bio_data
 * Returns the bio_data node containing robot personality, context, valid codes, and GET instruction rules.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const bio = await getBioData();

  if (format === "text") {
    const textOutput = [
      "============================================================",
      "             ROBOT SPECIFICATION & BIO DATA                 ",
      "============================================================",
      "",
      `[ROBOT PERSONALITY]`,
      `Name: ${bio.personality?.name}`,
      `Role: ${bio.personality?.role}`,
      `Tone: ${bio.personality?.tone}`,
      `Embodiment: ${bio.personality?.embodiment}`,
      `Speech Rules: ${bio.personality?.speech_rules}`,
      "",
      `[CONTEXT VALUES]`,
      `Active User: ${bio.context_values?.active_user}`,
      `Location: ${bio.context_values?.current_location}`,
      `Active Mode: ${bio.context_values?.active_mode}`,
      `Status: ${bio.context_values?.system_status}`,
      `Activity: ${bio.context_values?.current_activity}`,
      "",
      `[VALID CODES & HARDWARE MEANINGS]`,
      ...(Array.isArray(bio.codes)
        ? bio.codes.map(
            (c) =>
              `- CODE: ${c.code}\n  Meaning: ${c.meaning}\n  Value Example: ${c.example_value}\n  Hardware: ${c.hardware}\n  Description: ${c.description}\n`
          )
        : []),
      `[GEMINI GET INSTRUCTION RULES]`,
      `Rule: ${bio.gemini_instructions?.instruction_rule}`,
      `Endpoint: ${bio.gemini_instructions?.endpoint}`,
      `Method: ${bio.gemini_instructions?.method}`,
      `Allowed Codes: ${(bio.gemini_instructions?.allowed_codes || []).join(", ")}`,
      "============================================================",
    ].join("\n");

    return new NextResponse(textOutput, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json(bio, { status: 200, headers: CORS_HEADERS });
}

/**
 * POST /api/bio_data
 * Flexible update handler:
 * - { action: "add_code", code: { code, meaning, ... } }
 * - { action: "delete_code", code: "CODE_NAME" }
 * - { codes: [...] }
 * - Full bio_data object
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const currentBio = await getBioData();

    if (body.action === "add_code" && body.code) {
      const newEntry = {
        code: (body.code.code || "").toUpperCase().trim(),
        meaning: body.code.meaning || "",
        example_value: body.code.example_value || "0",
        description: body.code.description || "",
        hardware: body.code.hardware || "ESP32",
      };

      if (!newEntry.code) {
        return NextResponse.json({ success: false, error: "Code name is required" }, { status: 400 });
      }

      let codes = Array.isArray(currentBio.codes) ? [...currentBio.codes] : [];
      // Replace existing code if it exists, otherwise append
      const existingIdx = codes.findIndex((c) => c.code === newEntry.code);
      if (existingIdx >= 0) {
        codes[existingIdx] = newEntry;
      } else {
        codes.push(newEntry);
      }
      currentBio.codes = codes;
      if (currentBio.gemini_instructions) {
        currentBio.gemini_instructions.allowed_codes = codes.map((c) => c.code);
      }

      await setBioData(currentBio);
      return NextResponse.json(
        { success: true, message: `Code '${newEntry.code}' saved.`, bio_data: currentBio },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (body.action === "delete_code" && body.code) {
      const codeToDelete = (body.code || "").toUpperCase().trim();
      let codes = Array.isArray(currentBio.codes) ? currentBio.codes : [];
      codes = codes.filter((c) => c.code !== codeToDelete);
      currentBio.codes = codes;
      if (currentBio.gemini_instructions) {
        currentBio.gemini_instructions.allowed_codes = codes.map((c) => c.code);
      }

      await setBioData(currentBio);
      return NextResponse.json(
        { success: true, message: `Code '${codeToDelete}' removed.`, bio_data: currentBio },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (Array.isArray(body.codes)) {
      currentBio.codes = body.codes;
      if (currentBio.gemini_instructions) {
        currentBio.gemini_instructions.allowed_codes = body.codes.map((c) => c.code);
      }
      await setBioData(currentBio);
      return NextResponse.json(
        { success: true, message: "Codes list updated.", bio_data: currentBio },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Default: overwrite entire object
    const result = await setBioData(body);
    return NextResponse.json(
      { success: true, message: "bio_data updated successfully", bio_data: result },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update bio_data" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
