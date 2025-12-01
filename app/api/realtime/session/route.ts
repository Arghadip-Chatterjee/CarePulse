import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get prescription analysis from query params if provided
    const searchParams = request.nextUrl.searchParams;
    const prescriptionAnalysis = searchParams.get("prescriptionAnalysis") || "";

    // Get the SDP offer from the browser
    const sdp = await request.text();

    if (!sdp) {
      return NextResponse.json(
        { error: "SDP offer is required" },
        { status: 400 }
      );
    }

    // Build instructions based on prescription analysis
    const instructions = `You are a professional medical AI assistant conducting a voice consultation with a patient.

${prescriptionAnalysis ? `PRESCRIPTION ANALYSIS:
${prescriptionAnalysis}

` : ""}IMPORTANT: Start by greeting the patient ONCE at the beginning. After that, continue the conversation naturally without greeting again.

Your role:
- Listen to the patient and respond to their questions and concerns
${prescriptionAnalysis ? "- Discuss the medications from the prescription analysis above" : "- Ask about their medications"}
- Ask about symptoms and how they're feeling
- Provide empathetic, professional guidance
- Remind them you're providing information, not replacing their doctor

This consultation is limited to 5 minutes. Be conversational, warm, and supportive. Continue the conversation naturally - do not restart or greet again.`;

    // Configure the session - keep it simple like the docs example
    const sessionConfig: any = {
      type: "realtime",
      model: "gpt-realtime-mini",
      audio: {
        output: {
          voice: "verse"
        }
      },
      instructions: instructions
    };

    // Create FormData for multipart request
    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set("session", JSON.stringify(sessionConfig));

    console.log("Instructions:", instructions);
    // Forward to OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "Failed to create session with OpenAI" },
        { status: response.status }
      );
    }

    console.log("Response:", response);

    // Return the SDP answer from OpenAI
    const answerSdp = await response.text();

    return new NextResponse(answerSdp, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
      },
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
