"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { CreateAppointmentParams, UpdateAppointmentParams, AppointmentsResponse, AppointmentWithRelations } from "@/types/prisma.types";
import { Status } from "@prisma/client";

// Helper function to check for conflicting appointments
const checkForConflictingAppointments = async (appointment: CreateAppointmentParams) => {
  try {
    console.log("🔍 Checking for conflicting appointments...");
    console.log("Appointment data:", {
      userId: appointment.userId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      schedule: appointment.schedule.toISOString()
    });

    // Check for appointments with the same user and schedule
    console.log("Checking for user + schedule conflicts...");
    const userScheduleConflict = await prisma.appointment.findMany({
      where: {
        userId: appointment.userId,
        schedule: appointment.schedule
      }
    });

    console.log(`Found ${userScheduleConflict.length} user+schedule conflicts`);
    if (userScheduleConflict.length > 0) {
      console.log("Conflicting appointments:", userScheduleConflict);
      return {
        hasConflict: true,
        message: "You already have an appointment scheduled at this time."
      };
    }

    // Check for appointments with the same doctor and schedule
    console.log("Checking for doctor + schedule conflicts...");
    const doctorScheduleConflict = await prisma.appointment.findMany({
      where: {
        doctorId: appointment.doctorId,
        schedule: appointment.schedule
      }
    });

    console.log(`Found ${doctorScheduleConflict.length} doctor+schedule conflicts`);
    if (doctorScheduleConflict.length > 0) {
      console.log("Conflicting appointments:", doctorScheduleConflict);
      return {
        hasConflict: true,
        message: "The selected doctor already has an appointment at this time."
      };
    }

    // Check for appointments with the same patient and schedule
    console.log("Checking for patient + schedule conflicts...");
    const patientScheduleConflict = await prisma.appointment.findMany({
      where: {
        patientId: appointment.patientId,
        schedule: appointment.schedule
      }
    });

    console.log(`Found ${patientScheduleConflict.length} patient+schedule conflicts`);
    if (patientScheduleConflict.length > 0) {
      console.log("Conflicting appointments:", patientScheduleConflict);
      return {
        hasConflict: true,
        message: "This patient already has an appointment scheduled at this time."
      };
    }

    console.log("✅ No conflicts found, proceeding with appointment creation");
    return { hasConflict: false };
  } catch (error) {
    console.error("Error checking for conflicting appointments:", error);
    return { hasConflict: false }; // If check fails, proceed with creation
  }
};

// CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams,
  submissionId?: string
): Promise<AppointmentWithRelations> => {
  console.log("=== APPOINTMENT CREATION DEBUG ===");
  console.log("Timestamp:", new Date().toISOString());

  if (submissionId) {
    console.log("Submission ID for tracking:", submissionId);
  }

  console.log("Appointment data:", appointment);

  // Check for conflicting appointments before attempting creation
  const conflictCheck = await checkForConflictingAppointments(appointment);
  if (conflictCheck.hasConflict) {
    throw new Error(conflictCheck.message);
  }

  try {
    const newAppointment = await prisma.appointment.create({
      data: {
        userId: appointment.userId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        schedule: appointment.schedule,
        status: appointment.status,
        reason: appointment.reason,
        note: appointment.note,
        appointmentType: appointment.appointmentType,
        meeting: appointment.meeting || "",
        prescription: appointment.prescription || []
      },
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
        },
        prescriptions: true
      }
    });

    revalidatePath("/admin");
    console.log("✅ Appointment created successfully:", newAppointment);
    return newAppointment;
  } catch (error) {
    console.error("❌ Appointment creation failed:", error);
    throw error;
  }
};

// GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async (): Promise<AppointmentsResponse> => {
  try {
    const appointments = await prisma.appointment.findMany({
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
        },
        prescriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = appointments.reduce((acc, appointment) => {
      switch (appointment.status) {
        case "scheduled":
          acc.scheduledCount++;
          break;
        case "pending":
          acc.pendingCount++;
          break;
        case "cancelled":
          acc.cancelledCount++;
          break;
      }
      return acc;
    }, initialCounts);

    return {
      totalCount: appointments.length,
      ...counts,
      documents: appointments
    };
  } catch (error) {
    console.error("An error occurred while retrieving the recent appointments:", error);
    return {
      totalCount: 0,
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      documents: []
    };
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string): Promise<AppointmentWithRelations | null> => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
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
        },
        prescriptions: true
      }
    });

    return appointment;
  } catch (error) {
    console.error("An error occurred while retrieving the appointment:", error);
    throw error;
  }
};

// GET APPOINTMENTS BY USER ID
export const getAppointmentListByUserId = async (userId: string): Promise<AppointmentsResponse> => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId },
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
        },
        prescriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = appointments.reduce((acc, appointment) => {
      switch (appointment.status) {
        case "scheduled":
          acc.scheduledCount++;
          break;
        case "pending":
          acc.pendingCount++;
          break;
        case "cancelled":
          acc.cancelledCount++;
          break;
      }
      return acc;
    }, initialCounts);

    return {
      totalCount: appointments.length,
      ...counts,
      documents: appointments
    };
  } catch (error) {
    console.error("An error occurred while retrieving the appointments:", error);
    return {
      totalCount: 0,
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      documents: []
    };
  }
};

// GET APPOINTMENTS BY DOCTOR ID
export const getAppointmentbyDoctorId = async (doctorId: string): Promise<AppointmentsResponse> => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
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
        },
        prescriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = appointments.reduce((acc, appointment) => {
      switch (appointment.status) {
        case "scheduled":
          acc.scheduledCount++;
          break;
        case "pending":
          acc.pendingCount++;
          break;
        case "cancelled":
          acc.cancelledCount++;
          break;
      }
      return acc;
    }, initialCounts);

    return {
      totalCount: appointments.length,
      ...counts,
      documents: appointments
    };
  } catch (error) {
    console.error("An error occurred while retrieving the appointments:", error);
    return {
      totalCount: 0,
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      documents: []
    };
  }
};

// UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  appointment,
  type,
}: UpdateAppointmentParams): Promise<AppointmentWithRelations | null> => {
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...appointment,
        schedule: appointment.schedule ? new Date(appointment.schedule) : undefined
      },
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
        },
        prescriptions: true
      }
    });

    revalidatePath("/admin");
    return updatedAppointment;
  } catch (error) {
    console.error("An error occurred while updating the appointment:", error);
    throw error;
  }
};

// ACCEPT APPOINTMENT
export const acceptAppointment = async (appointmentId: string): Promise<AppointmentWithRelations | null> => {
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "scheduled" },
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
        },
        prescriptions: true
      }
    });

    revalidatePath("/admin");
    return updatedAppointment;
  } catch (error) {
    console.error("An error occurred while accepting the appointment:", error);
    throw error;
  }
};

// CANCEL APPOINTMENT
export const cancelAppointment = async (appointmentId: string): Promise<AppointmentWithRelations | null> => {
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
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
        },
        prescriptions: true
      }
    });

    revalidatePath("/admin");
    return updatedAppointment;
  } catch (error) {
    console.error("An error occurred while cancelling the appointment:", error);
    throw error;
  }
};

// UPDATE MEETING LINK
export const meeting = async (appointmentId: string, meetingLink: string): Promise<AppointmentWithRelations | null> => {
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { meeting: meetingLink },
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
        },
        prescriptions: true
      }
    });

    revalidatePath("/admin");
    return updatedAppointment;
  } catch (error) {
    console.error("An error occurred while updating the meeting link:", error);
    throw error;
  }
};
