import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the SDP offer from the browser
    const sdp = await request.text();

    if (!sdp) {
      return NextResponse.json(
        { error: "SDP offer is required" },
        { status: 400 }
      );
    }

    // Get prescription context from query params if provided
    const searchParams = request.nextUrl.searchParams;
    const prescriptionContext = searchParams.get("prescriptions") || "";

    // Configure the session with prescription context
    const sessionConfig = JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "verse",
      instructions: `You are a professional medical AI assistant conducting a voice consultation with a patient.

${prescriptionContext ? `The patient has uploaded the following prescriptions: ${prescriptionContext}` : ""}

Your role:
1. Ask clarifying questions about their medications, symptoms, and health concerns
2. Be empathetic, professional, and thorough
3. If prescription handwriting is unclear, ask the patient to clarify
4. Discuss current symptoms and how they're feeling
5. Provide general health guidance (remind them you're not replacing a real doctor)

At the end of the consultation, when the patient says they're done or ready to end:
- Provide a comprehensive summary including:
  * Medications discussed
  * Symptoms reported
  * Health concerns identified
  * Recommendations given
  * Suggested next steps

Remember: Be conversational, warm, and supportive while maintaining professionalism.`
    });

    // Create FormData for multipart request
    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set("session", sessionConfig);

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
