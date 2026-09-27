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
    // Generate clean text representation for Gemini or console readers
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
 * Update bio_data in database.
 */
export async function POST(request) {
  try {
    const updatedBio = await request.json();
    const result = await setBioData(updatedBio);
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
