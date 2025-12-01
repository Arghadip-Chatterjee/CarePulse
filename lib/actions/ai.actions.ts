"use server";

import prisma  from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Create a new AI consultation session
export async function createAIConsultation(
  userId: string,
  patientId: string,
  prescriptionUrls: string[],
  consultationType: "text" | "voice" = "text"
) {
  try {
    const consultation = await prisma.aIConsultation.create({
      data: {
        userId,
        patientId,
        prescriptionUrls,
        conversationHistory: [],
        status: "in_progress",
        consultationType,
      },
    });

    return { success: true, consultationId: consultation.id };
  } catch (error) {
    console.error("Error creating AI consultation:", error);
    return { success: false, error: "Failed to create consultation" };
  }
}

// Analyze prescriptions using OpenAI Vision API
export async function analyzePrescriptions(
  consultationId: string,
  prescriptionUrls: string[]
) {
  try {
    const systemPrompt = `You are a medical AI assistant helping to analyze patient prescriptions. 
Your role is to:
1. Extract information from prescription images (medications, dosages, doctor notes)
2. Identify any unclear handwriting or missing information
3. Ask clarifying questions about unclear parts
4. Gather information about the patient's current symptoms

Be professional, empathetic, and thorough. If you cannot read something clearly, ask the patient to clarify.`;

    const userMessage = `I have uploaded ${prescriptionUrls.length} prescription(s). Please analyze them and let me know:
1. What medications you can identify
2. Any parts that are unclear or you cannot read
3. What additional information you need from me`;

    // Create message content with images
    const imageContents = prescriptionUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            ...imageContents,
          ],
        },
      ],
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content || "";

    // Update conversation history
    await prisma.aIConsultation.update({
      where: { id: consultationId },
      data: {
        conversationHistory: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
          { role: "assistant", content: aiResponse },
        ],
      },
    });

    return { success: true, message: aiResponse };
  } catch (error) {
    console.error("Error analyzing prescriptions:", error);
    return { success: false, error: "Failed to analyze prescriptions" };
  }
}

// Send a message in the consultation chat
export async function sendMessageToAI(
  consultationId: string,
  userMessage: string
) {
  try {
    const consultation = await prisma.aIConsultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      return { success: false, error: "Consultation not found" };
    }

    const history = consultation.conversationHistory as Message[];

    // Add user message to history
    const updatedHistory = [
      ...history,
      { role: "user" as const, content: userMessage },
    ];

    // Get AI response
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: updatedHistory,
      max_tokens: 800,
    });

    const aiResponse = response.choices[0].message.content || "";

    // Add AI response to history
    const finalHistory = [
      ...updatedHistory,
      { role: "assistant" as const, content: aiResponse },
    ];

    // Update conversation history
    await prisma.aIConsultation.update({
      where: { id: consultationId },
      data: {
        conversationHistory: finalHistory,
      },
    });

    return { success: true, message: aiResponse };
  } catch (error) {
    console.error("Error sending message to AI:", error);
    return { success: false, error: "Failed to send message" };
  }
}

// Complete the consultation and extract structured information
export async function completeConsultation(consultationId: string) {
  try {
    const consultation = await prisma.aIConsultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      return { success: false, error: "Consultation not found" };
    }

    const history = consultation.conversationHistory as Message[];

    // Ask AI to extract structured information
    const extractionPrompt = `Based on our conversation, please extract and summarize the following information in JSON format:
{
  "medications": ["list of medications identified"],
  "symptoms": ["current symptoms reported by patient"],
  "concerns": ["main health concerns"],
  "clarifications": ["any clarifications provided by patient"],
  "recommendations": ["your recommendations for next steps"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        ...history,
        { role: "user", content: extractionPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const extractedInfo = JSON.parse(
      response.choices[0].message.content || "{}"
    );

    // Update consultation with extracted info and mark as completed
    await prisma.aIConsultation.update({
      where: { id: consultationId },
      data: {
        extractedInfo,
        status: "completed",
      },
    });

    return { success: true, extractedInfo };
  } catch (error) {
    console.error("Error completing consultation:", error);
    return { success: false, error: "Failed to complete consultation" };
  }
}

// Get consultation by ID
export async function getConsultation(consultationId: string) {
  try {
    const consultation = await prisma.aIConsultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      return { success: false, error: "Consultation not found" };
    }

    return { success: true, consultation };
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return { success: false, error: "Failed to fetch consultation" };
  }
}

// Save voice consultation summary
export async function saveVoiceConsultationSummary(
  consultationId: string,
  summary: string
) {
  try {
    await prisma.aIConsultation.update({
      where: { id: consultationId },
      data: {
        conversationSummary: summary,
        status: "completed",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving voice consultation summary:", error);
    return { success: false, error: "Failed to save summary" };
  }
}
