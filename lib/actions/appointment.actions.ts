"use server";

import { revalidatePath } from "next/cache";

import { ID, Query } from "node-appwrite";

import nodemailer from 'nodemailer';

import { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  messaging,
} from "../appwrite.config";

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
    const userScheduleConflict = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.equal("userId", [appointment.userId]),
        Query.equal("schedule", [appointment.schedule.toISOString()])
      ]
    );

    console.log(`Found ${userScheduleConflict.documents.length} user+schedule conflicts`);
    if (userScheduleConflict.documents.length > 0) {
      console.log("Conflicting appointments:", userScheduleConflict.documents);
      return {
        hasConflict: true,
        message: "You already have an appointment scheduled at this time."
      };
    }

    // Check for appointments with the same doctor and schedule
    console.log("Checking for doctor + schedule conflicts...");
    const doctorScheduleConflict = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.equal("doctorId", [appointment.doctorId]),
        Query.equal("schedule", [appointment.schedule.toISOString()])
      ]
    );

    console.log(`Found ${doctorScheduleConflict.documents.length} doctor+schedule conflicts`);
    if (doctorScheduleConflict.documents.length > 0) {
      console.log("Conflicting appointments:", doctorScheduleConflict.documents);
      return {
        hasConflict: true,
        message: "The selected doctor already has an appointment at this time."
      };
    }

    // Check for appointments with the same patient and schedule
    console.log("Checking for patient + schedule conflicts...");
    const patientScheduleConflict = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.equal("patient", [appointment.patient]),
        Query.equal("schedule", [appointment.schedule.toISOString()])
      ]
    );

    console.log(`Found ${patientScheduleConflict.documents.length} patient+schedule conflicts`);
    if (patientScheduleConflict.documents.length > 0) {
      console.log("Conflicting appointments:", patientScheduleConflict.documents);
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

  // Check all environment variables
  const envCheck = checkEnvironmentVariables();
  if (!envCheck.allPresent) {
    throw new Error(`Missing environment variables: ${envCheck.missing.join(', ')}`);
  }

  console.log("Database ID:", DATABASE_ID);
  console.log("Collection ID:", APPOINTMENT_COLLECTION_ID);
  console.log("Appointment data:", appointment);

  // Log submission ID for tracking (not stored in DB until schema is updated)
  if (submissionId) {
    console.log("Submission ID for tracking:", submissionId);
    // TODO: Add submissionId field to the collection schema to enable duplicate detection
  }

  // Check for conflicting appointments before attempting creation
  const conflictCheck = await checkForConflictingAppointments(appointment);
  if (conflictCheck.hasConflict) {
    throw new Error(conflictCheck.message);
  }

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Generate a unique ID that complies with Appwrite rules (max 36 chars, a-z, A-Z, 0-9, period, hyphen, underscore)
      const timestamp = Date.now().toString(36); // Convert to base36 for shorter length
      const random = Math.random().toString(36).substring(2, 6); // 4 char random string
      const attemptSuffix = attempt > 1 ? `r${attempt}` : '';
      let uniqueId = `appt${timestamp}${random}${attemptSuffix}`;

      // Ensure the ID is valid for Appwrite
      uniqueId = uniqueId.replace(/[^a-zA-Z0-9._-]/g, ''); // Remove invalid characters
      uniqueId = uniqueId.substring(0, 36); // Ensure max 36 chars

      // If it starts with a special character, add a prefix
      if (uniqueId.match(/^[._-]/)) {
        uniqueId = `a${uniqueId}`.substring(0, 36);
      }

      console.log(`Creating appointment with ID: ${uniqueId} (attempt ${attempt})`);

      const newAppointment = await databases.createDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        uniqueId,
        appointment
      );

      revalidatePath("/admin");
      return parseStringify(newAppointment);
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed while creating appointment:`, error);
      console.error("Full error details:", JSON.stringify(error, null, 2));

      // Check if it's a unique constraint violation (409 error)
      if (error?.code === 409) {
        console.log("❌ Unique constraint violation detected!");
        console.log("This means there's already an appointment with the same values for unique fields");
        console.log("Appointment data that caused conflict:", appointment);

        // Don't retry for unique constraint violations - the data itself is the problem
        const errorMessage = "An appointment with these details already exists. Please check the date, time, doctor, or patient selection.";
        throw new Error(errorMessage);
      }

      // For other errors, retry with a new ID
      if (attempt < maxRetries) {
        console.log(`Retrying appointment creation with new ID (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }

      // If it's the last attempt, try with Appwrite's ID.unique()
      if (attempt === maxRetries) {
        console.log(`Last attempt: Using Appwrite's ID.unique()`);
        try {
          const newAppointment = await databases.createDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            ID.unique(),
            appointment
          );
          revalidatePath("/admin");
          return parseStringify(newAppointment);
        } catch (fallbackError) {
          console.error("Fallback with ID.unique() also failed:", fallbackError);
          lastError = fallbackError;
        }
      }

      break;
    }
  }

  console.error("All attempts failed while creating appointment:", lastError);
  throw lastError; // Re-throw the last error
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
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
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
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
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
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      // APPOINTMENT_COLLECTION_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

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
    const appointment = await databases.getDocument(
      DATABASE_ID!,
      // APPOINTMENT_COLLECTION_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );

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
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      // APPOINTMENT_COLLECTION_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
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
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
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
    const response = await databases.listDocuments(
      DATABASE_ID!,
      // APPOINTMENT_COLLECTION_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("doctorId", [doctorId])]
    );

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (response.documents as Appointment[]).reduce(
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
      totalCount: response.total,
      ...counts,
      documents: response.documents,
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
  }
};

const sanitizeData = (data: Record<string, any>) => {
  const ignoredKeys = ["$id", "$collectionId", "$databaseId", "$createdAt", "$updatedAt"];
  return Object.fromEntries(Object.entries(data).filter(([key]) => !ignoredKeys.includes(key)));
};

export const acceptAppointment = async (appointmentId: string) => {
  revalidatePath("/admin", "page");
  const existing = await databases.getDocument(
    DATABASE_ID!,
    // APPOINTMENT_COLLECTION_ID!,
    APPOINTMENT_COLLECTION_ID!,
    appointmentId
  );

  const safeData = sanitizeData(existing);
  revalidatePath("/admin", "page");
  console.log("accept appointment", safeData);

  // function randomID(len:number) {
  //   let result = '';
  //   if (result) return result;
  //   var chars = '12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP',
  //     maxPos = chars.length,
  //     i;
  //   len = len || 5;
  //   for (i = 0; i < len; i++) {
  //     result += chars.charAt(Math.floor(Math.random() * maxPos));
  //   }
  //   return result;
  // }

  // const appID = 1599881424 ;
  // const serverSecret = "1ee186e068b30db4530a4c4367aabf0a";
  // const roomID = `room-${appointmentId}`; 
  // const kitToken =  ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID,  randomID(5),  randomID(5));

  // const zp = ZegoUIKitPrebuilt.create(kitToken);
  // const meetingLink = `${window.location.protocol}//${window.location.host}/video?roomID=${roomID}`;


  return await databases.updateDocument(
    DATABASE_ID!,
    // APPOINTMENT_COLLECTION_ID!,
    APPOINTMENT_COLLECTION_ID!,
    appointmentId,
    {
      ...safeData,
      status: "scheduled",
      // meeting:roomID,
    }
  );
};

export const cancelAppointment = async (appointmentId: string) => {

  const existing = await databases.getDocument(
    DATABASE_ID!,
    // APPOINTMENT_COLLECTION_ID!,
    APPOINTMENT_COLLECTION_ID!,
    appointmentId
  );

  const safeData = sanitizeData(existing);

  revalidatePath("/admin", "page");
  console.log("cancel appointment", safeData);

  return await databases.updateDocument(
    DATABASE_ID!,
    // APPOINTMENT_COLLECTION_ID!,
    APPOINTMENT_COLLECTION_ID!,
    appointmentId,
    {
      ...safeData,
      status: "cancelled",
    }
  );
};

export const meeting = async (appointmentId: string, meetingLink: string) => {

  const existing = await databases.getDocument(
    DATABASE_ID!,
    // APPOINTMENT_COLLECTION_ID!,
    APPOINTMENT_COLLECTION_ID!,
    appointmentId
  );
  const safeData = sanitizeData(existing);
  // revalidatePath("/admin", "page");
  console.log("meeting appointment", safeData);
  return await databases.updateDocument(
    DATABASE_ID!,
    // APPOINTMENT_COLLECTION_ID!,
    APPOINTMENT_COLLECTION_ID!,
    appointmentId,
    {
      ...safeData,
      meeting: meetingLink,
    }
  );

}




