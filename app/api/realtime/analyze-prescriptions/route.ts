import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { prescriptionUrls } = await request.json();

        if (!prescriptionUrls || !Array.isArray(prescriptionUrls) || prescriptionUrls.length === 0) {
            return NextResponse.json(
                { analysis: "No prescriptions provided." },
                { status: 200 }
            );
        }

        // Build content array with images
        const content: any[] = [
            {
                type: "text",
                text: `Please analyze these prescription images carefully. For each prescription, identify:
1. Medication names
2. Dosages and frequency
3. Instructions for use
4. Any warnings or special notes
5. Any unclear or illegible parts that need clarification

Provide a clear, structured analysis that will be used by an AI assistant to conduct a medical consultation.`
            }
        ];

        // Add each prescription image
        prescriptionUrls.forEach((url: string) => {
            content.push({
                type: "image_url",
                image_url: {
                    url: url,
                }
            });
        });

        // Analyze prescriptions using GPT-4o Vision
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: content
                }
            ],
            max_tokens: 1500,
        });

        const analysis = response.choices[0].message.content || "Unable to analyze prescriptions.";

        console.log("Analysis:", analysis);

        return NextResponse.json({ analysis }, { status: 200 });
    } catch (error) {
        console.error("Prescription analysis error:", error);
        return NextResponse.json(
            { error: "Failed to analyze prescriptions" },
            { status: 500 }
        );
    }
}

