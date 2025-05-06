"use server";

import { ID, InputFile, Query } from "node-appwrite";
import { Doctor } from "@/types/appwrite.types";

import { CreateDoctorParams, RegisterDoctorParams } from "@/types/doctor.types";
import {
    DATABASE_ID,
    ENDPOINT,
    DOCTOR_COLLECTION_ID,
    PROJECT_ID,
    databases,
    storage,
    users,
} from "../appwrite.config";
import { parseStringify } from "../utils";


// CREATE APPWRITE USER FOR DOCTOR
export const createDoctor = async (doctor: CreateDoctorParams) => {
    try {
        // Create a new doctor user
        const newDoctor = await users.create(
            ID.unique(),
            doctor.email,
            doctor.phone,
            undefined,
            doctor.name
        );

        return parseStringify(newDoctor);
    } catch (error: any) {
        // Check if the user already exists
        if (error?.code === 409) {
            const existingDoctor = await users.list([
                Query.equal("email", [doctor.email]),
            ]);

            return existingDoctor.users[0];
        }
        console.error("An error occurred while creating a new doctor:", error);
    }
};

// REGISTER DOCTOR
export const registerDoctor = async ({
    identificationDocument,
    ...doctor
}: RegisterDoctorParams) => {
    try {
        // Upload identification document if available
        let file;
        if (identificationDocument) {
            const inputFile = InputFile.fromBlob(
                identificationDocument.get("blobFile") as Blob,
                identificationDocument.get("fileName") as string
            );

            file = await storage.createFile(process.env.NEXT_PUBLIC_BUCKET_ID!, ID.unique(), inputFile);
        }

        // Create a new doctor document in the database
        const newDoctor = await databases.createDocument(
            DATABASE_ID!,
            DOCTOR_COLLECTION_ID!,
            ID.unique(),
            {
                ...doctor,
                identificationDocumentId: file?.$id || null,
                identificationDocumentUrl: file?.$id
                    ? `${ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${file.$id}/view??project=${PROJECT_ID}`
                    : null,
                ...doctor,
            }
        );

        return parseStringify(newDoctor);
    } catch (error) {
        console.error("An error occurred while registering a doctor:", error);
    }
};

// GET DOCTOR
export const getDoctor = async (userId: string) => {
    try {
        const doctors = await databases.listDocuments(
            DATABASE_ID!,
            DOCTOR_COLLECTION_ID!,
            [Query.equal("userId", [userId])]
        );

        return parseStringify(doctors.documents[0]);
    } catch (error) {
        console.error("An error occurred while retrieving the doctor details:", error);
    }
};

export const getDoctorsList = async () => {
    try {
        const doctors = await databases.listDocuments(
            DATABASE_ID!,
            DOCTOR_COLLECTION_ID!,
            [Query.orderDesc("$createdAt")]
        );

        const initialCounts = {
            verifiedCount: 0,
            unverifiedCount: 0,
        };

        const counts = (doctors.documents as Doctor[]).reduce((acc, doctor) => {
            if (doctor.isVerified) {
                acc.verifiedCount++;
            } else {
                acc.unverifiedCount++;
            }
            return acc;
        }, initialCounts);

        const data = {
            totalCount: doctors.total,
            ...counts,
            documents: doctors.documents,
        };

        return parseStringify(data);
    } catch (error) {
        console.error("An error occurred while retrieving the doctors list:", error);
    }
};

export const verifyDoctor = async (doctorId: string) => {
    try {
        await databases.updateDocument(DATABASE_ID!, DOCTOR_COLLECTION_ID!, doctorId, {
            isVerified: true,
        });
        console.log("Doctor Verified Successfully!");
        return true;
        // alert("Doctor Verified Successfully!");
        // window.location.reload(); // Refresh to update UI
    } catch (error) {
        console.error("Error verifying doctor:", error);
        return false;
        // alert("Failed to verify doctor.");
    }
};

// GET VERIFIED DOCTOR LIST
export const getVerifiedDoctors = async () => {
    try {
        const doctors = await databases.listDocuments(
            DATABASE_ID!,
            DOCTOR_COLLECTION_ID!,
            [Query.equal("isVerified", [true])]
        );
        const data = parseStringify(doctors);
        console.log("Verified Doctors:", data);
        return data;
    } catch (error) {
        console.error("An error occurred while retrieving the verified doctors list:", error);
    }
}






