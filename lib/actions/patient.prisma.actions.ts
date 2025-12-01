"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { CreateUserParams, RegisterPatientParams, PatientWithUser } from "@/types/prisma.types";

// CREATE USER
export const createUser = async (user: CreateUserParams) => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: user
    });

    return newUser;
  } catch (error) {
    console.error("An error occurred while creating a new user:", error);
    throw error;
  }
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    return user;
  } catch (error) {
    console.error("An error occurred while retrieving the user:", error);
    throw error;
  }
};

// REGISTER PATIENT
export const registerPatient = async ({
  identificationDocument,
  ...patientData
}: RegisterPatientParams) => {
  try {
    // Create user first
    const user = await createUser({
      name: patientData.name,
      email: patientData.email,
      phone: patientData.phone
    });

    // Handle file upload (you'll need to implement file storage)
    let identificationDocumentId: string | undefined;
    let identificationDocumentUrl: string | undefined;

    if (identificationDocument) {
      // TODO: Implement file upload to your preferred storage service
      // For now, we'll skip file handling
      console.log("File upload not implemented yet");
    }

    // Create patient record
    const newPatient = await prisma.patient.create({
      data: {
        userId: user.id,
        birthDate: patientData.birthDate,
        gender: patientData.gender,
        address: patientData.address,
        occupation: patientData.occupation,
        emergencyContactName: patientData.emergencyContactName,
        emergencyContactNumber: patientData.emergencyContactNumber,
        insuranceProvider: patientData.insuranceProvider,
        insurancePolicyNumber: patientData.insurancePolicyNumber,
        allergies: patientData.allergies,
        currentMedication: patientData.currentMedication,
        familyMedicalHistory: patientData.familyMedicalHistory,
        pastMedicalHistory: patientData.pastMedicalHistory,
        identificationType: patientData.identificationType,
        identificationNumber: patientData.identificationNumber,
        identificationDocumentId,
        identificationDocumentUrl,
        privacyConsent: patientData.privacyConsent
      },
      include: {
        user: true
      }
    });

    revalidatePath("/admin");
    return newPatient;
  } catch (error) {
    console.error("An error occurred while creating a new patient:", error);
    throw error;
  }
};

// GET PATIENT
export const getPatient = async (userId: string): Promise<PatientWithUser | null> => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    return patient;
  } catch (error) {
    console.error("An error occurred while retrieving the patient:", error);
    throw error;
  }
};

// GET ALL PATIENTS
export const getPatientsList = async () => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      totalCount: patients.length,
      documents: patients
    };
  } catch (error) {
    console.error("An error occurred while retrieving the patients list:", error);
    return {
      totalCount: 0,
      documents: []
    };
  }
};

// UPDATE PATIENT
export const updatePatient = async (userId: string, data: Partial<RegisterPatientParams>) => {
  try {
    const patient = await prisma.patient.update({
      where: { userId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined
      },
      include: {
        user: true
      }
    });

    revalidatePath("/admin");
    return patient;
  } catch (error) {
    console.error("An error occurred while updating the patient:", error);
    throw error;
  }
};

// DELETE PATIENT
export const deletePatient = async (userId: string) => {
  try {
    // This will also delete the associated user due to cascade
    await prisma.patient.delete({
      where: { userId }
    });

    revalidatePath("/admin");
    return true;
  } catch (error) {
    console.error("An error occurred while deleting the patient:", error);
    throw error;
  }
};

