"use server";

import { revalidatePath } from "next/cache";

import { ID, Query } from "node-appwrite";

import nodemailer from 'nodemailer';

import { Appointment } from "@/types/appwrite.types";

import {
  messaging,
} from "../appwrite.config";
import prisma from "@/lib/prisma";

import { formatDateTime, parseStringify } from "../utils";
import { checkEnvironmentVariables } from "../env-check";

// Helper function to check for existing appointments that might conflict
const checkForConflictingAppointments = async (appointment: CreateAppointmentParams) => {
  try {
    console.log("🔍 Checking for conflicting appointments...");
    console.log("Appointment data:", {
      userId: appointment.userId,
      patient: appointment.patient,
      doctorId: appointment.doctorId,
      schedule: appointment.schedule.toISOString()
    });

    // Check for appointments with the same user and schedule
    console.log("Checking for user + schedule conflicts...");
    // Check for appointments with the same user and schedule
    console.log("Checking for user + schedule conflicts...");
    const userScheduleConflict = await prisma.appointment.findMany({
      where: {
        userId: appointment.userId,
        schedule: appointment.schedule,
      },
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
    // Check for appointments with the same doctor and schedule
    console.log("Checking for doctor + schedule conflicts...");
    const doctorScheduleConflict = await prisma.appointment.findMany({
      where: {
        doctorId: appointment.doctorId,
        schedule: appointment.schedule,
      },
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
    // Check for appointments with the same patient and schedule
    console.log("Checking for patient + schedule conflicts...");
    const patientScheduleConflict = await prisma.appointment.findMany({
      where: {
        patientId: appointment.patient,
        schedule: appointment.schedule,
      },
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

//  CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams,
  submissionId?: string
) => {
  console.log("=== APPOINTMENT CREATION DEBUG ===");
  console.log("Timestamp:", new Date().toISOString());

  // Check for conflicting appointments before attempting creation
  const conflictCheck = await checkForConflictingAppointments(appointment);
  if (conflictCheck.hasConflict) {
    throw new Error(conflictCheck.message);
  }

  try {
    const newAppointment = await prisma.appointment.create({
      data: {
        userId: appointment.userId,
        patient: {
          connect: { id: appointment.patient },
        },
        doctor: {
          connect: { id: appointment.doctorId },
        },
        schedule: appointment.schedule,
        reason: appointment.reason,
        note: appointment.note,
        status: appointment.status as string,
        appointmenttype: appointment.appointmenttype,

      },
    });

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error: any) {
    console.error("An error occurred while creating a new appointment:", error);
    throw error;
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.NEXT_PUBLIC_SMTP_HOST!, // e.g., 'smtp.gmail.com'
  port: 587, // or 465 for secure
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.NEXT_PUBLIC_SMTP_USER!, // your email address
    pass: process.env.NEXT_PUBLIC_SMTP_PASS!, // your email password or app-specific password
  },
  ignoreTLS: true,
  service: 'Gmail',
});

//  GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        patient: true,
      },
    });

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments as any[]).reduce(
      (acc, appointment) => {
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
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.length,
      ...counts,
      documents: appointments.map((appt:any) => ({
        ...appt,
        doctor: appt.doctorId,
      })),
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
    // Return default data structure to prevent admin page from breaking
    return {
      totalCount: 0,
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      documents: [],
    };
  }
};

//  SEND SMS NOTIFICATION
export const sendSMSNotification = async (userId: string, content: string) => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [],
      [userId]
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending sms:", error);
  }
};

export const sendEmail = async (templateParams: any) => {
  try {
    const mailOptions = {
      from: 'arghadipchatterjee2016@gmail.com', // sender address
      to: templateParams.to_email, // list of receivers
      subject: templateParams.subject, // Subject line
      text: templateParams.text, // plain text body
      html: templateParams.html, // html body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('An error occurred while sending email:', error);
  }
};

//  UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  // timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    // Update appointment to scheduled -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#updateDocument
    // Update appointment to scheduled -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#updateDocument
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: appointment,
    });

    if (!updatedAppointment) throw Error;

    const smsMessage = `Greetings from CarePulse. ${type === "schedule" ? `Your appointment is confirmed for ${formatDateTime(appointment.schedule!).dateTime} with Dr. ${appointment.primaryPhysician}` : `We regret to inform that your appointment for ${formatDateTime(appointment.schedule!).dateTime} is cancelled. Reason:  ${appointment.cancellationReason}`}.`;
    await sendSMSNotification(userId, smsMessage);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("An error occurred while scheduling an appointment:", error);
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
      },
    });

    return parseStringify(appointment);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
  }
};


//  GET RECENT APPOINTMENTS based on userId
export const getAppointmentListByUserId = async (userId: string) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments as any[]).reduce(
      (acc, appointment) => {
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
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.length,
      ...counts,
      documents: appointments.map((appt: any) => ({
        ...appt,
        doctor: appt.doctor?.name || "Not Assigned",
      })),
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
  }
};

//  GET APPOINTMENTS based on doctorId
export const getAppointmentbyDoctorId = async (doctorId: string) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments as any[]).reduce(
      (acc, appointment) => {
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
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.length,
      ...counts,
      documents: appointments.map((appt: any) => ({
        ...appt,
        doctor: appt.doctor?.name || "Not Assigned",
      })),
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
  }
};



export const acceptAppointment = async (appointmentId: string) => {
  revalidatePath("/admin", "page");
  revalidatePath("/admin", "page");
  console.log("accept appointment", appointmentId);

  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "scheduled",
    },
  });
};

export const cancelAppointment = async (appointmentId: string) => {

  revalidatePath("/admin", "page");
  console.log("cancel appointment", appointmentId);

  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "cancelled",
    },
  });
};

export const meeting = async (appointmentId: string, meetingLink: string) => {

  console.log("meeting appointment", appointmentId);
  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      meeting: meetingLink,
    },
  });

}





export const updateAppointmentVisitedStatus = async (
  appointmentId: string,
  hasVisited: boolean
) => {
  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        hasVisited,
      },
    });

    if (!updatedAppointment) throw Error;

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error(
      "An error occurred while updating appointment visited status:",
      error
    );
  }
};
