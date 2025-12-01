"use server";

import { ID, InputFile, Query } from "node-appwrite";

import { Doctor } from "@/types/appwrite.types";
import { CreateDoctorParams, RegisterDoctorParams } from "@/types/doctor.types";
import { parseStringify } from "../utils";
import prisma from "@/lib/prisma";
import { signUp } from "./auth.actions";
import { uploadFile, fileToBase64 } from "./storage.actions";


// CREATE APPWRITE USER FOR DOCTOR
// CREATE DOCTOR USER
export const createDoctor = async (doctor: CreateDoctorParams) => {
    try {
        // Check if user already exists to avoid throwing error
        const existingUser = await prisma.user.findUnique({
            where: { email: doctor.email },
            include: { doctor: true },
        });

        if (existingUser) {
            return parseStringify(existingUser);
        }

        // Create a new doctor user
        const newDoctor = await signUp({
            name: doctor.name,
            email: doctor.email,
            phone: doctor.phone,
            password: doctor.phone, // Using phone as default password
            role: "doctor",
        });

        return parseStringify(newDoctor);
    } catch (error: any) {
        console.error("An error occurred while creating a new doctor:", error);
        throw error;
    }
};

// REGISTER DOCTOR
// REGISTER DOCTOR
export const registerDoctor = async ({
    identificationDocument,
    ...doctor
}: RegisterDoctorParams) => {
    try {
        // Upload identification document if available
        let fileId: string | null = null;
        let fileUrl: string | null = null;

        if (identificationDocument) {
            const blob = identificationDocument.get("blobFile") as Blob;
            if (blob) {
                const base64 = await fileToBase64(blob);
                const uploadResult = await uploadFile(base64, "doctor-documents");
                fileId = uploadResult.publicId;
                fileUrl = uploadResult.url;
            }
        }

        // Extract userId from doctor data
        const userId = (doctor as any).userId;
        
        if (!userId) {
            throw new Error("userId is required to register a doctor. Make sure the user is created first.");
        }

        // Remove userId from doctor data to avoid conflicts
        const { userId: _, ...doctorData } = doctor as any;

        // Create a new doctor document in the database
        const newDoctor = await prisma.doctor.create({
            data: {
                ...doctorData,
                identificationDocumentId: fileId,
                identificationDocumentUrl: fileUrl,
                user: {
                    connect: { id: userId }
                }
            },
        });

        return parseStringify(newDoctor);
    } catch (error) {
        console.error("An error occurred while registering a doctor:", error);
        throw error;
    }
};

// GET DOCTOR
export const getDoctor = async (userId: string) => {
    try {
        const doctor = await prisma.doctor.findFirst({
            where: { userId },
        });

        return parseStringify(doctor);
    } catch (error) {
        console.error("An error occurred while retrieving the doctor details:", error);
    }
};

export const getDoctorsList = async () => {
    try {
        const doctors = await prisma.doctor.findMany({
            orderBy: { createdAt: "desc" },
        });

        const initialCounts = {
            verifiedCount: 0,
            unverifiedCount: 0,
        };

        const counts = (doctors as any[]).reduce((acc, doctor) => {
            if (doctor.isVerified) {
                acc.verifiedCount++;
            } else {
                acc.unverifiedCount++;
            }
            return acc;
        }, initialCounts);

        const data = {
            totalCount: doctors.length,
            ...counts,
            documents: doctors,
        };

        return parseStringify(data);
    } catch (error) {
        console.error("An error occurred while retrieving the doctors list:", error);
        // Return default data structure to prevent admin page from breaking
        return {
            totalCount: 0,
            verifiedCount: 0,
            unverifiedCount: 0,
            documents: [],
        };
    }
};

export const verifyDoctor = async (doctorId: string) => {
    try {
        await prisma.doctor.update({
            where: { id: doctorId },
            data: {
                isVerified: true,
            },
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
        const doctors = await prisma.doctor.findMany({
            where: { isVerified: true },
        });
        const data = parseStringify(doctors);

        return data;
    } catch (error) {
        console.error("An error occurred while retrieving the verified doctors list:", error);
    }
}

// GET DOCTOR BY ID
export const getDoctorById = async (doctorId: string) => {
    try {
        const doctor = await prisma.doctor.findUnique({
            where: { id: doctorId },
        });
        
        return parseStringify(doctor);
    } catch (error) {
        console.error("An error occurred while retrieving the doctor by ID:", error);
        return null;
    }
};






