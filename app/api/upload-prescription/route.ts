import { NextRequest, NextResponse } from "next/server";
import { uploadPrescription } from "@/lib/actions/prescription.action";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const file = formData.get("file") as File | null;
        const userId = formData.get("userId") as string | null;
        const appointmentId = formData.get("appointmentId") as string | null; // Make appointmentId nullable

        if (!file || !userId) { // Remove appointmentId from this check
            return NextResponse.json(
                { error: "Missing file or userId" },
                { status: 400 }
            );
        }

        const result = await uploadPrescription(file, file.name, userId, appointmentId || ""); // Pass empty string if appointmentId is null

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}