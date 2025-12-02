"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { CreateDoctorParams, DoctorWithUser, DoctorsResponse } from "@/types/prisma.types";

// CREATE DOCTOR USER
export const createDoctor = async (doctor: CreateDoctorParams) => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: doctor.email }
    });

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        password: "defaultPassword123", // TODO: Implement proper password generation/hashing
        role: "doctor",
      }
    });

    return newUser;
  } catch (error) {
    console.error("An error occurred while creating a new doctor:", error);
    throw error;
  }
};

// REGISTER DOCTOR
export const registerDoctor = async ({
  identificationDocument,
  ...doctorData
}: CreateDoctorParams) => {
  try {
    // Create user first
    const user = await createDoctor(doctorData);

    // Handle file upload (you'll need to implement file storage)
    let identificationDocumentId: string | undefined;
    let identificationDocumentUrl: string | undefined;

    if (identificationDocument) {
      // TODO: Implement file upload to your preferred storage service
      console.log("File upload not implemented yet");
    }

    // Create doctor record
    const newDoctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        name: doctorData.name,
        email: doctorData.email,
        phone: doctorData.phone,
        specialization: doctorData.specialization,
        licenseNumber: doctorData.licenseNumber,
        yearsOfExperience: doctorData.yearsOfExperience,
        hospitalAffiliation: doctorData.hospitalAffiliation,
        identificationType: doctorData.identificationType,
        identificationNumber: doctorData.identificationNumber,
        identificationDocumentId,
        identificationDocumentUrl,
        consultationFee: doctorData.consultationFee,
        availableTimingsOnline: doctorData.availableTimingsOnline,
        availableTimingsOffline: doctorData.availableTimingsOffline,
        isVerified: false
      },
      include: {
        user: true
      }
    });

    revalidatePath("/admin");
    return newDoctor;
  } catch (error) {
    console.error("An error occurred while registering a doctor:", error);
    throw error;
  }
};

// GET DOCTOR
export const getDoctor = async (userId: string): Promise<DoctorWithUser | null> => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    return doctor as unknown as DoctorWithUser;
  } catch (error) {
    console.error("An error occurred while retrieving the doctor details:", error);
    throw error;
  }
};

// GET DOCTORS LIST
export const getDoctorsList = async (): Promise<DoctorsResponse> => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const initialCounts = {
      verifiedCount: 0,
      unverifiedCount: 0,
    };

    const counts = doctors.reduce((acc, doctor) => {
      if (doctor.isVerified) {
        acc.verifiedCount++;
      } else {
        acc.unverifiedCount++;
      }
      return acc;
    }, initialCounts);

    return {
      totalCount: doctors.length,
      ...counts,
      documents: doctors as unknown as DoctorWithUser[]
    };
  } catch (error) {
    console.error("An error occurred while retrieving the doctors list:", error);
    return {
      totalCount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      documents: []
    };
  }
};

// VERIFY DOCTOR
export const verifyDoctor = async (doctorId: string) => {
  try {
    await prisma.doctor.update({
      where: { id: doctorId },
      data: { isVerified: true }
    });

    console.log("Doctor Verified Successfully!");
    revalidatePath("/admin");
    return true;
  } catch (error) {
    console.error("Error verifying doctor:", error);
    return false;
  }
};

// GET VERIFIED DOCTORS
export const getVerifiedDoctors = async () => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isVerified: true },
      include: {
        user: true
      }
    });

    return {
      totalCount: doctors.length,
      documents: doctors as unknown as DoctorWithUser[]
    };
  } catch (error) {
    console.error("An error occurred while retrieving the verified doctors list:", error);
    return {
      totalCount: 0,
      documents: []
    };
  }
};

// UPDATE DOCTOR
export const updateDoctor = async (doctorId: string, data: Partial<CreateDoctorParams>) => {
  try {
    const doctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        ...data,
        availableTimingsOnline: data.availableTimingsOnline || undefined,
        availableTimingsOffline: data.availableTimingsOffline || undefined
      },
      include: {
        user: true
      }
    });

    revalidatePath("/admin");
    revalidatePath("/doctors");
    return doctor;
  } catch (error) {
    console.error("An error occurred while updating the doctor:", error);
    throw error;
  }
};

// DELETE DOCTOR
export const deleteDoctor = async (doctorId: string) => {
  try {
    // This will also delete the associated user due to cascade
    await prisma.doctor.delete({
      where: { id: doctorId }
    });

    revalidatePath("/admin");
    return true;
  } catch (error) {
    console.error("An error occurred while deleting the doctor:", error);
    throw error;
  }
};

