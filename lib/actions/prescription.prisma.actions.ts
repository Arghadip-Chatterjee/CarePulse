"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { CreatePrescriptionParams, PrescriptionWithRelations, PrescriptionsResponse } from "@/types/prisma.types";

// UPLOAD PRESCRIPTION
export async function uploadPrescription(
  fileBlob: Blob,
  fileName: string,
  userId: string,
  appointmentId?: string
): Promise<PrescriptionWithRelations> {
  try {
    // TODO: Implement file upload to your preferred storage service
    // For now, we'll create a mock URL
    const prescriptionUrl = `https://your-storage-service.com/prescriptions/${fileName}`;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const prescription = await prisma.prescription.create({
      data: {
        userId,
        appointmentId,
        prescriptionUrl,
        fileId
      },
      include: {
        user: true,
        appointment: {
          include: {
            user: true,
            patient: {
              include: {
                user: true
              }
            },
            doctor: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    revalidatePath("/admin");
    return prescription;
  } catch (error) {
    console.error("An error occurred while uploading the prescription:", error);
    throw error;
  }
}

// GET PRESCRIPTIONS BY USER ID
export const getPrescriptionsByUserId = async (userId: string): Promise<PrescriptionsResponse> => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { userId },
      include: {
        user: true,
        appointment: {
          include: {
            user: true,
            patient: {
              include: {
                user: true
              }
            },
            doctor: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      totalCount: prescriptions.length,
      documents: prescriptions
    };
  } catch (error) {
    console.error("An error occurred while retrieving the prescriptions:", error);
    return {
      totalCount: 0,
      documents: []
    };
  }
};

// GET PRESCRIPTIONS BY APPOINTMENT ID
export const getPrescriptionsByAppointmentId = async (appointmentId: string): Promise<PrescriptionsResponse> => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { appointmentId },
      include: {
        user: true,
        appointment: {
          include: {
            user: true,
            patient: {
              include: {
                user: true
              }
            },
            doctor: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      totalCount: prescriptions.length,
      documents: prescriptions
    };
  } catch (error) {
    console.error("An error occurred while retrieving the prescriptions:", error);
    return {
      totalCount: 0,
      documents: []
    };
  }
};

// GET ALL PRESCRIPTIONS
export const getAllPrescriptions = async (): Promise<PrescriptionsResponse> => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        user: true,
        appointment: {
          include: {
            user: true,
            patient: {
              include: {
                user: true
              }
            },
            doctor: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      totalCount: prescriptions.length,
      documents: prescriptions
    };
  } catch (error) {
    console.error("An error occurred while retrieving the prescriptions:", error);
    return {
      totalCount: 0,
      documents: []
    };
  }
};

// UPDATE PRESCRIPTION
export async function updatePrescription(id: string, newUrl: string): Promise<PrescriptionWithRelations | null> {
  try {
    const prescription = await prisma.prescription.update({
      where: { id },
      data: { prescriptionUrl: newUrl },
      include: {
        user: true,
        appointment: {
          include: {
            user: true,
            patient: {
              include: {
                user: true
              }
            },
            doctor: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    revalidatePath("/admin");
    return prescription;
  } catch (error) {
    console.error("An error occurred while updating the prescription:", error);
    throw error;
  }
}

// DELETE PRESCRIPTION
export const deletePrescription = async (id: string): Promise<boolean> => {
  try {
    await prisma.prescription.delete({
      where: { id }
    });

    revalidatePath("/admin");
    return true;
  } catch (error) {
    console.error("An error occurred while deleting the prescription:", error);
    throw error;
  }
};
