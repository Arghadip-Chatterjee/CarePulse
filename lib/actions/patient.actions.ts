"use server";

import { ID, InputFile, Query } from "node-appwrite";

import { parseStringify } from "../utils";
import prisma from "@/lib/prisma";
import { signUp } from "./auth.actions";
import { uploadFile, fileToBase64 } from "./storage.actions";

// CREATE USER
export const createUser = async (user: CreateUserParams) => {
  try {
    // Check if user already exists to avoid throwing error
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { patient: true },
    });

    if (existingUser) {
      return parseStringify(existingUser);
    }

    // Create new user with auth
    const newUser = await signUp({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: (user as any).password || user.phone, // Use provided password or fallback to phone
      role: "patient",
    });

    return parseStringify(newUser);
  } catch (error: any) {
    console.error("An error occurred while creating a new user:", error);
    throw error;
  }
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return parseStringify(user);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the user details:",
      error
    );
    throw error;
  }
};

// REGISTER PATIENT
export const registerPatient = async ({
  identificationDocument,
  ...patient
}: RegisterUserParams) => {
  try {
    // Upload file to Cloudinary
    let fileId: string | null = null;
    let fileUrl: string | null = null;

    if (identificationDocument) {
      const blob = identificationDocument.get("blobFile") as Blob;
      if (blob) {
        const base64 = await fileToBase64(blob);
        const uploadResult = await uploadFile(base64, "patient-documents");
        fileId = uploadResult.publicId;
        fileUrl = uploadResult.url;
      }
    }

    // Extract userId - it should be in the patient object
    const userId = (patient as any).userId;
    
    console.log("Patient data:", patient);
    console.log("Extracted userId:", userId);
    
    if (!userId) {
      throw new Error("userId is required to register a patient. Make sure the user is created first.");
    }

    // Remove userId from patient data to avoid conflicts
    const { userId: _, ...patientData } = patient as any;

    // Create new patient document and connect to existing user
    const newPatient = await prisma.patient.create({
      data: {
        ...patientData,
        identificationDocumentId: fileId,
        identificationDocumentUrl: fileUrl,
        user: {
          connect: { id: userId }
        }
      },
    });

    return parseStringify(newPatient);
  } catch (error) {
    console.error("An error occurred while creating a new patient:", error);
    throw error;
  }
};

// GET PATIENT
export const getPatient = async (userId: string) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId },
    });

    return parseStringify(patient);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the patient details:",
      error
    );
  }
};
