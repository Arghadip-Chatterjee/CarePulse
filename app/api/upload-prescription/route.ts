import { NextRequest, NextResponse } from "next/server";
import { uploadPrescription } from "@/lib/actions/prescription.action";

export async function POST(req: NextRequest) {
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
        return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
    }

    try {
        const result = await uploadPrescription(file, file.name, userId);
        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
