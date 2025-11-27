"use server";

import { revalidatePath } from "next/cache";
import { ID, Query, InputFile } from "node-appwrite";
import 'dotenv/config'


import { parseStringify } from "../utils";
import prisma from "@/lib/prisma";
import { uploadFile, deleteFile, fileToBase64 } from "./storage.actions";

// Upload Prescription
export async function uploadPrescription(
    fileBlob: Blob,
    fileName: string,
    userId: string,
    appointmentId?: string // optional
  ) {
    // Convert blob to base64 and upload to Cloudinary
    const base64 = await fileToBase64(fileBlob);
    const uploadResult = await uploadFile(base64, "prescriptions", fileName);
  
    const fileUrl = uploadResult.url;
  
    await prisma.prescription.create({
      data: {
        prescription_url: fileUrl,
        fileId: uploadResult.publicId,
        user_id: userId,
        uploaded_at: new Date(),
        appointmentId: appointmentId || null,
      },
    });
  
    revalidatePath(`/patients/${userId}/prescription`, 'page');
  
    return fileUrl;
  }
  

// Fetch Prescriptions
export const getPrescriptionListByUserId = async (userId: string) => {
    try {
        const prescriptions = await prisma.prescription.findMany({
            where: { user_id: userId },
        });

        return parseStringify(prescriptions); // matches your appointment logic
    } catch (error) {
        console.error("Error fetching prescriptions:", error);
        return null;
    }
};


// Update Prescription
export async function updatePrescription(id: string, newUrl: string) {
    await prisma.prescription.update({
        where: { id },
        data: { prescription_url: newUrl },
    });
}

export async function deletePrescription(docId: string, fileId: string, userId: string) {
    // Delete from Cloudinary
    await deleteFile(fileId);

    // Delete from database
    await prisma.prescription.delete({
        where: { id: docId },
    });

    // Revalidate the user's prescription page
    revalidatePath(`/patients/${userId}/prescription`, 'page');
}
