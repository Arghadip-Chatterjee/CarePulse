"use server";

import { revalidatePath } from "next/cache";
import { ID, Query, InputFile } from "node-appwrite";
import 'dotenv/config'

import {
    PROJECT_ID,
    databases,
    storage,
} from "../appwrite.config";
import { parseStringify } from "../utils";

// Upload Prescription
export async function uploadPrescription(fileBlob: Blob, fileName: string, userId: string) {
    const inputFile = InputFile.fromBlob(fileBlob, fileName);

    const response = await storage.createFile(
        process.env.NEXT_PUBLIC_BUCKET_ID!,
        ID.unique(),
        inputFile
    );

    const fileUrl = `${process.env.NEXT_PUBLIC_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${response.$id}/view?project=${PROJECT_ID}&mode=admin&permissions[read]=role:member`;

    await databases.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_PRESCRIPTION_COLLECTION_ID!,
        ID.unique(),
        {
            prescription_url: fileUrl,
            fileId: response.$id,
            user_id: userId,
            uploaded_at: new Date().toISOString(),
        }
    );

    revalidatePath(`/patients/${userId}/prescription`, 'page');

    return fileUrl;
}

// Fetch Prescriptions
export const getPrescriptionListByUserId = async (userId: string) => {
    try {
        const prescriptions = await databases.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_PRESCRIPTION_COLLECTION_ID!,
            [Query.equal("user_id", [userId])]
        );

        return parseStringify(prescriptions); // matches your appointment logic
    } catch (error) {
        console.error("Error fetching prescriptions:", error);
        return null;
    }
};


// Update Prescription
export async function updatePrescription(id: string, newUrl: string) {
    await databases.updateDocument(process.env.NEXT_PUBLIC_DATABASE_ID!, process.env.NEXT_PUBLIC_PRESCRIPTION_COLLECTION_ID!, id, { prescription_url: newUrl });
}

export async function deletePrescription(docId: string, fileId: string, userId: string) {
    await storage.deleteFile(
        process.env.NEXT_PUBLIC_BUCKET_ID!,
        fileId
    );

    await databases.deleteDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_PRESCRIPTION_COLLECTION_ID!,
        docId
    );

    // Revalidate the user's prescription page
    revalidatePath(`/patients/${userId}/prescription`, 'page');
}
