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

// Helper function to assign waiting list patient to a freed slot
// When a slot is freed from the 2-hour main window (pending/scheduled cancellation),
// assign it to the first waiting list patient (FIFO)
const assignWaitingListPatientToSlot = async (doctorId: string, freedSchedule: Date) => {
  try {
    console.log(`🔍 Checking for waiting list patients to assign to freed slot: ${freedSchedule.toISOString()}`);

    // Get doctor's start time to determine the 2-hour window
    const doctorStartTime = await getDoctorStartTime(doctorId, freedSchedule);
    if (!doctorStartTime) {
      console.error("Could not find doctor start time for waiting list assignment");
      return;
    }

    const twoHoursAfterStart = new Date(doctorStartTime);
    twoHoursAfterStart.setHours(twoHoursAfterStart.getHours() + 2);

    // Check if the freed slot is within the 2-hour window
    const normalizedFreedTime = new Date(freedSchedule);
    normalizedFreedTime.setSeconds(0, 0);
    normalizedFreedTime.setMilliseconds(0);

    if (normalizedFreedTime > twoHoursAfterStart) {
      console.log(`ℹ️ Freed slot is outside 2-hour window, skipping waiting list assignment`);
      return;
    }

    // Find the first patient in waiting list (FIFO - first come, first served)
    // Waiting list patients are those scheduled after the 2-hour window
    // We assign them to freed slots within the 2-hour window
    const waitingListPatient = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmenttype: "online",
        schedule: {
          gte: twoHoursAfterStart, // Waiting list starts after 2-hour window
        },
        status: "waitingList",
      },
      orderBy: {
        createdAt: "asc", // First come, first served (FIFO)
      },
    });

    if (waitingListPatient) {
      console.log(`📋 Found waiting list patient: ${waitingListPatient.id} (created at: ${waitingListPatient.createdAt.toISOString()})`);

      // Assign this slot to the waiting list patient
      const updatedAppointment = await prisma.appointment.update({
        where: { id: waitingListPatient.id },
        data: {
          status: "scheduled",
          schedule: freedSchedule, // Use the exact freed schedule time
        },
      });

      console.log(`✅ Assigned waiting list patient ${waitingListPatient.id} to freed slot at ${freedSchedule.toISOString()}`);
      console.log(`   - Patient moved from waiting list to scheduled`);
      console.log(`   - Original waiting list time: ${waitingListPatient.schedule.toISOString()}`);
      console.log(`   - New scheduled time: ${freedSchedule.toISOString()}`);

      // Send email notification to patient about slot assignment
      await sendAppointmentUpdateEmail(updatedAppointment, "waitingList");
    } else {
      console.log(`ℹ️ No waiting list patients found for doctor ${doctorId}`);
    }
  } catch (error) {
    console.error("Error assigning waiting list patient to slot:", error);
  }
};

// Helper function to get doctor's start time for a given schedule date
const getDoctorStartTime = async (
  doctorId: string,
  scheduleDate: Date
): Promise<Date | null> => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { availableTimingsOnline: true },
    });

    if (!doctor || !doctor.availableTimingsOnline || doctor.availableTimingsOnline.length === 0) {
      return null;
    }

    // Get the day name from the schedule date
    // Use local date to avoid timezone issues - get the date in local timezone
    const localDate = new Date(scheduleDate);
    // Get the date components in local timezone
    const year = localDate.getFullYear();
    const month = localDate.getMonth();
    const day = localDate.getDate();
    // Create a new date in local timezone to get the correct day name
    const localScheduleDate = new Date(year, month, day);
    const dayName = localScheduleDate.toLocaleDateString('en-US', { weekday: 'long' });

    console.log(`📅 Getting doctor start time:`);
    console.log(`   - Schedule date (input): ${scheduleDate.toISOString()}`);
    console.log(`   - Local date: ${localScheduleDate.toLocaleDateString()}`);
    console.log(`   - Day name: ${dayName}`);

    // Find the timing for this day
    const timingString = doctor.availableTimingsOnline.find((timing: string) => {
      const parts = timing.split(":");
      const day = parts[0]?.trim();
      return day === dayName;
    });

    if (!timingString) {
      return null;
    }

    // Parse the time (e.g., "Monday: 10:00 AM")
    const parts = timingString.split(":");
    if (parts.length < 2) return null;

    const timeString = parts.slice(1).join(":").trim(); // "10:00 AM"

    // Parse time string to get hours and minutes
    const [time, period] = timeString.split(" ");
    const [hours, minutes] = time.split(":").map(Number);

    // Convert period to uppercase for comparison (handles "am/pm" or "AM/PM")
    const periodUpper = period?.toUpperCase().trim();

    let hour24 = hours;
    if (periodUpper === "PM" && hours !== 12) {
      hour24 = hours + 12;
    } else if (periodUpper === "AM" && hours === 12) {
      hour24 = 0;
    }

    console.log(`   - Parsed time string: "${timeString}"`);
    console.log(`   - Time: ${time}, Period: ${period} (${periodUpper})`);
    console.log(`   - Hours: ${hours}, Minutes: ${minutes}, Hour24: ${hour24}`);

    // Create date with doctor's start time
    // Use the local date components to avoid timezone issues
    const startTime = new Date(year, month, day, hour24, minutes, 0, 0);

    console.log(`   - Doctor start time created: ${startTime.toISOString()} (${startTime.toLocaleString()})`);
    console.log(`   - Hours: ${hour24}, Minutes: ${minutes}`);

    return startTime;
  } catch (error) {
    console.error("Error getting doctor start time:", error);
    return null;
  }
};

// Helper function to calculate queue position and adjusted schedule for online appointments
const calculateOnlineAppointmentQueue = async (
  doctorId: string,
  originalSchedule: Date,
  appointmentType: string
): Promise<{ adjustedSchedule: Date; queuePosition: number; isValid: boolean; message?: string; isWaitingList?: boolean }> => {
  // Only apply queue logic for online appointments
  if (appointmentType !== "online") {
    return { adjustedSchedule: originalSchedule, queuePosition: 0, isValid: true };
  }

  try {
    // Get doctor's start time for this day
    const doctorStartTime = await getDoctorStartTime(doctorId, originalSchedule);

    if (!doctorStartTime) {
      return {
        adjustedSchedule: originalSchedule,
        queuePosition: 0,
        isValid: false,
        message: "Doctor's start time not found for this day.",
      };
    }

    // Check if the appointment is within 2 hours from doctor's start time
    const twoHoursAfterStart = new Date(doctorStartTime);
    twoHoursAfterStart.setHours(twoHoursAfterStart.getHours() + 2);

    // Normalize the original schedule to the minute (remove seconds and milliseconds)
    const normalizedTime = new Date(originalSchedule);
    normalizedTime.setSeconds(0, 0);
    normalizedTime.setMilliseconds(0);

    // Check if the selected time (or adjusted time) would exceed 2 hours from start
    // We need to calculate the queue first to know the final time
    const dayStart = new Date(normalizedTime);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(normalizedTime);
    dayEnd.setHours(23, 59, 59, 999);

    // Find all existing online appointments for this doctor within the 2-hour window
    // Include both "pending" and "scheduled" statuses
    const allDayAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmenttype: "online",
        schedule: {
          gte: doctorStartTime,
          lte: twoHoursAfterStart,
        },
        status: {
          in: ["pending", "scheduled"], // Include both pending and scheduled (exclude waitingList)
        },
      },
      orderBy: {
        schedule: "asc",
      },
    });

    // Find appointments that belong to the same queue
    // A queue consists of appointments that are multiples of 10 minutes from the doctor's start time
    // The first user gets the doctor's start time, subsequent users get +10 minutes each
    const queueMembers = allDayAppointments.filter((apt) => {
      const aptTime = new Date(apt.schedule);
      aptTime.setSeconds(0, 0);
      aptTime.setMilliseconds(0);

      // Calculate the difference in minutes from the doctor's start time
      const diffMinutes = (aptTime.getTime() - doctorStartTime.getTime()) / (1000 * 60);

      // Check if this appointment is part of the same queue
      // It should be at the doctor's start time or at multiples of 10 minutes after
      // We allow a small tolerance (±1 minute) for rounding
      return diffMinutes >= -1 && diffMinutes % 10 <= 1;
    });

    const queuePosition = queueMembers.length;

    // Calculate adjusted schedule: first patient gets doctor's start time, 
    // each subsequent patient gets 10 minutes after the previous one
    // Use doctor's start time as the base, not the normalizedTime
    const adjustedSchedule = new Date(doctorStartTime);
    adjustedSchedule.setMinutes(adjustedSchedule.getMinutes() + (queuePosition * 10));

    // Check if the adjusted schedule exceeds 2 hours from doctor's start time
    // If it does, check if we can add to waiting list (max 5 patients)
    // Waiting list continues the 10-minute interval pattern
    if (adjustedSchedule > twoHoursAfterStart) {
      // Get all waiting list appointments for this time slot to calculate position
      const waitingListAppointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmenttype: "online",
          schedule: {
            gte: twoHoursAfterStart, // Waiting list starts after 2-hour window
          },
          status: "waitingList",
        },
        orderBy: {
          schedule: "asc",
        },
      });

      // Filter waiting list appointments that belong to the same queue (same original time slot)
      // Waiting list appointments should continue from twoHoursAfterStart with 10-minute intervals
      const sameQueueWaitingList = waitingListAppointments.filter((apt) => {
        // Check if this waiting list appointment belongs to the same original time slot
        // by checking if it's a continuation of the queue pattern
        const aptTime = new Date(apt.schedule);
        aptTime.setSeconds(0, 0);
        aptTime.setMilliseconds(0);

        // Calculate if this appointment is at a 10-minute interval from twoHoursAfterStart
        const diffMinutes = (aptTime.getTime() - twoHoursAfterStart.getTime()) / (1000 * 60);
        return diffMinutes >= 0 && diffMinutes % 10 <= 1; // Allow small tolerance
      });

      const waitingListPosition = sameQueueWaitingList.length;

      // If waiting list has less than 5 patients, allow adding to waiting list
      if (waitingListPosition < 5) {
        // Calculate the waiting list schedule: continue from twoHoursAfterStart with 10-minute intervals
        const waitingListSchedule = new Date(twoHoursAfterStart);
        waitingListSchedule.setMinutes(waitingListSchedule.getMinutes() + (waitingListPosition * 10));

        return {
          adjustedSchedule: waitingListSchedule, // Use calculated waiting list time (10-min intervals)
          queuePosition: queuePosition + waitingListPosition + 1,
          isValid: true, // Valid for waiting list
          message: `You have been added to the waiting list. You will be notified when a slot becomes available.`,
          isWaitingList: true,
        };
      } else {
        return {
          adjustedSchedule: originalSchedule,
          queuePosition: queuePosition + waitingListPosition + 1,
          isValid: false,
          message: `Cannot book appointment. The queue and waiting list are full for this time slot. Maximum booking window is 2 hours from doctor's start time (${doctorStartTime.toLocaleTimeString()}).`,
        };
      }
    }

    console.log(`📋 Queue calculation for online appointment:`);
    console.log(`   - Doctor start time: ${doctorStartTime.toISOString()}`);
    console.log(`   - 2-hour window ends: ${twoHoursAfterStart.toISOString()}`);
    console.log(`   - Original time: ${normalizedTime.toISOString()}`);
    console.log(`   - Existing appointments in queue: ${queuePosition}`);
    console.log(`   - Queue position: ${queuePosition + 1}`);
    console.log(`   - Adjusted time: ${adjustedSchedule.toISOString()}`);

    return { adjustedSchedule, queuePosition: queuePosition + 1, isValid: true };
  } catch (error) {
    console.error("Error calculating queue position:", error);
    // If calculation fails, use original schedule
    return { adjustedSchedule: originalSchedule, queuePosition: 0, isValid: false, message: "Error calculating queue position." };
  }
};

// Helper function to check for existing appointments that might conflict
const checkForConflictingAppointments = async (appointment: CreateAppointmentParams, isWaitingList: boolean = false) => {
  try {
    console.log("🔍 Checking for conflicting appointments...");
    console.log("Appointment data:", {
      userId: appointment.userId,
      patient: appointment.patient,
      doctorId: appointment.doctorId,
      schedule: appointment.schedule.toISOString(),
      appointmenttype: appointment.appointmenttype,
      isWaitingList,
    });

    // Rule 0: Check if the appointment date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.schedule);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return {
        hasConflict: true,
        message: "Cannot book appointment on past dates. Please select today or a future date.",
      };
    }

    // Rule 1: Check if user has any scheduled/pending/waitingList appointment on the same date
    // Users can book appointments on different dates, but only ONE appointment per date
    // This includes: scheduled, pending, AND waiting list appointments
    // BUT: Users CAN book again on the same date if their existing appointment status is "visited"
    // Extract date part (YYYY-MM-DD) for comparison
    const nextDay = new Date(appointmentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    console.log("Checking for appointments on the same date...");
    const sameDateAppointments = await prisma.appointment.findMany({
      where: {
        userId: appointment.userId,
        schedule: {
          gte: appointmentDate,
          lt: nextDay,
        },
        // Check for appointments that would conflict (exclude "visited" and "notVisited" statuses)
        status: {
          in: ["pending", "scheduled", "waitingList"], // Count all active appointments including waiting list
        },
      },
    });

    console.log(`Found ${sameDateAppointments.length} appointments on the same date (excluding visited/notVisited)`);
    // Apply same-date rule to ALL appointments, including waiting list
    // If user has any scheduled/pending/waitingList appointment on that date, they cannot book another (even in waiting list)
    // BUT: If the appointment status is "visited", they CAN book again on that date
    if (sameDateAppointments.length > 0) {
      console.log("Conflicting appointments on same date:", sameDateAppointments);

      // Check if any of the conflicts are waiting list appointments
      const hasWaitingList = sameDateAppointments.some(apt => apt.status === "waitingList");
      const hasScheduledPending = sameDateAppointments.some(apt => apt.status === "pending" || apt.status === "scheduled");

      let message = `You already have an appointment on ${appointmentDate.toLocaleDateString()}. `;
      if (hasWaitingList && hasScheduledPending) {
        message += "You have both a scheduled/pending appointment and a waiting list entry on this date. Please cancel them first or book for a different date.";
      } else if (hasWaitingList) {
        message += "You are already on the waiting list for this date. Please cancel it first or book for a different date.";
      } else {
        message += "Please cancel it first or book for a different date.";
      }

      return {
        hasConflict: true,
        message
      };
    }

    // Rule 3: For online appointments, we handle conflicts differently (queue system)
    // No doctor conflict checking for online appointments (queue handles it)
    if (appointment.appointmenttype === "online") {
      // For online appointments, we allow multiple patients but will adjust the schedule
      // No doctor conflict checking needed - queue system handles it
      console.log("Online appointment - queue system will handle scheduling");
      return { hasConflict: false };
    } else {
      // For offline appointments, NO doctor conflict checking
      // Multiple patients can book the same doctor at the same time for offline appointments
      console.log("Offline appointment - no doctor conflict checking");
      return { hasConflict: false };
    }
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

  try {
    // For online appointments, calculate queue position and adjust schedule FIRST
    // Then check for conflicts using the adjusted schedule
    let finalSchedule = appointment.schedule;
    let queuePosition = 0;

    if (appointment.appointmenttype === "online") {
      // First, clean up any existing appointments that exceed the 2-hour window
      // This ensures we're working with valid data
      await cancelAppointmentsExceedingTimeWindow();

      const queueResult = await calculateOnlineAppointmentQueue(
        appointment.doctorId,
        appointment.schedule,
        appointment.appointmenttype
      );

      // Check if the queue calculation is valid
      if (!queueResult.isValid) {
        throw new Error(queueResult.message || "Cannot book appointment at this time.");
      }

      finalSchedule = queueResult.adjustedSchedule;
      queuePosition = queueResult.queuePosition;

      // If this is a waiting list appointment, set status to waitingList
      if (queueResult.isWaitingList) {
        appointment.status = "waitingList" as Status;
        console.log(`📋 Patient added to waiting list for time slot: ${finalSchedule.toISOString()}`);
      }

      console.log(`✅ Online appointment queue processed:`);
      console.log(`   - Queue position: ${queuePosition}`);
      console.log(`   - Final schedule: ${finalSchedule.toISOString()}`);
      console.log(`   - Is waiting list: ${queueResult.isWaitingList || false}`);

      // For online appointments, check conflicts using the ADJUSTED schedule
      // Create a temporary appointment object with adjusted schedule for conflict checking
      const appointmentWithAdjustedSchedule = {
        ...appointment,
        schedule: finalSchedule,
      };

      // Check for conflicts - same-date rule applies to ALL appointments including waiting list
      const conflictCheck = await checkForConflictingAppointments(appointmentWithAdjustedSchedule);

      if (conflictCheck.hasConflict) {
        // Same-date conflicts apply to ALL appointments, including waiting list
        // If user has any appointment (scheduled/pending/waitingList) on the same date, block the booking
        throw new Error(conflictCheck.message);
      }
    } else {
      // For offline appointments, check conflicts using the original schedule
      const conflictCheck = await checkForConflictingAppointments(appointment);
      if (conflictCheck.hasConflict) {
        throw new Error(conflictCheck.message);
      }
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        userId: appointment.userId,
        patient: {
          connect: { id: appointment.patient },
        },
        doctor: {
          connect: { id: appointment.doctorId },
        },
        schedule: finalSchedule, // Use adjusted schedule for online appointments
        reason: appointment.reason,
        note: appointment.note,
        status: appointment.status as string,
        appointmenttype: appointment.appointmenttype,
      },
    });

    revalidatePath("/admin");

    // Send email notification
    const emailType = newAppointment.status === "waitingList" ? "waitingList" : "created";
    await sendAppointmentUpdateEmail(newAppointment, emailType, { queuePosition });

    // Return appointment with queue information if it's online
    const result = parseStringify(newAppointment);
    if (appointment.appointmenttype === "online") {
      if (appointment.status === "waitingList") {
        // Add waiting list information to the response
        (result as any).isWaitingList = true;
        (result as any).waitingListMessage = `You have been added to the waiting list. You will be notified when a slot becomes available.`;
      } else if (queuePosition > 1) {
        // Add queue information to the response
        (result as any).queuePosition = queuePosition;
        (result as any).queueMessage = `You are ${queuePosition === 1 ? 'the first' : `#${queuePosition} in the queue`}. Your appointment time has been adjusted to ${finalSchedule.toLocaleString()}.`;
      }
    }

    return result;
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
      documents: appointments.map((appt: any) => ({
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
      from: process.env.NEXT_PUBLIC_SMTP_USER || 'arghadipchatterjee2016@gmail.com', // sender address
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

// Helper function to send appointment update emails
const sendAppointmentUpdateEmail = async (
  appointment: any,
  updateType: 'created' | 'accepted' | 'cancelled' | 'visited' | 'notVisited' | 'waitingList',
  additionalInfo?: { queuePosition?: number; cancellationReason?: string }
) => {
  try {
    // Fetch patient and doctor details
    const appointmentWithDetails = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointmentWithDetails || !appointmentWithDetails.patient) {
      console.error('Appointment or patient not found for email notification');
      return;
    }

    const patient = appointmentWithDetails.patient;
    const doctor = appointmentWithDetails.doctor;
    const scheduleDate = formatDateTime(appointmentWithDetails.schedule);
    const appointmentId = appointmentWithDetails.id;

    let subject = '';
    let html = '';
    let text = '';

    switch (updateType) {
      case 'created':
        if (appointmentWithDetails.status === 'waitingList') {
          subject = 'CarePulse - Added to Waiting List';
          html = `
            <h1>Appointment Waiting List</h1>
            <h3>Appointment ID: ${appointmentId}</h3>
            <p>Dear ${patient.name},</p>
            <p>Your appointment request with Dr. ${doctor?.name || 'Doctor'} has been added to the waiting list.</p>
            <p><strong>Appointment Details:</strong></p>
            <ul>
              <li>Date & Time: ${scheduleDate.dateTime}</li>
              <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
              <li>Type: ${appointmentWithDetails.appointmenttype}</li>
              <li>Reason: ${appointmentWithDetails.reason}</li>
            </ul>
            <p>You will be notified when a slot becomes available.</p>
            <p>Thank you for choosing CarePulse!</p>
            <hr/>
            <p><strong>Team CarePulse</strong></p>
          `;
          text = `Your appointment with Dr. ${doctor?.name || 'Doctor'} has been added to the waiting list. Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}`;
        } else {
          subject = 'CarePulse - Appointment Created';
          const queueInfo = additionalInfo?.queuePosition
            ? `<p><strong>Queue Position:</strong> ${additionalInfo.queuePosition === 1 ? 'You are first in the queue' : `You are #${additionalInfo.queuePosition} in the queue`}</p>`
            : '';
          html = `
            <h1>Appointment Created</h1>
            <h3>Appointment ID: ${appointmentId}</h3>
            <p>Dear ${patient.name},</p>
            <p>Your appointment has been successfully created!</p>
            <p><strong>Appointment Details:</strong></p>
            <ul>
              <li>Date & Time: ${scheduleDate.dateTime}</li>
              <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
              <li>Type: ${appointmentWithDetails.appointmenttype}</li>
              <li>Reason: ${appointmentWithDetails.reason}</li>
              <li>Status: ${appointmentWithDetails.status}</li>
            </ul>
            ${queueInfo}
            <p>Please visit the doctor at the scheduled time and manage your prescriptions from the portal.</p>
            <p>Thank you for choosing CarePulse!</p>
            <hr/>
            <p><strong>Team CarePulse</strong></p>
          `;
          text = `Your appointment has been created. Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}. Doctor: ${doctor?.name || 'Not Assigned'}`;
        }
        break;

      case 'accepted':
        subject = 'CarePulse - Appointment Confirmed';
        html = `
          <h1>Appointment Confirmed</h1>
          <h3>Appointment ID: ${appointmentId}</h3>
          <p>Dear ${patient.name},</p>
          <p>Your appointment has been confirmed!</p>
          <p><strong>Appointment Details:</strong></p>
          <ul>
            <li>Date & Time: ${scheduleDate.dateTime}</li>
            <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
            <li>Type: ${appointmentWithDetails.appointmenttype}</li>
            <li>Reason: ${appointmentWithDetails.reason}</li>
            <li>Status: Scheduled</li>
          </ul>
          <p>Please visit the doctor at the scheduled time and manage your prescriptions from the portal.</p>
          <p>Thank you for choosing CarePulse!</p>
          <hr/>
          <p><strong>Team CarePulse</strong></p>
        `;
        text = `Your appointment has been confirmed. Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}. Doctor: ${doctor?.name || 'Not Assigned'}`;
        break;

      case 'cancelled':
        subject = 'CarePulse - Appointment Cancelled';
        const cancellationReason = additionalInfo?.cancellationReason || appointmentWithDetails.cancellationReason || 'Cancelled';
        html = `
          <h1>Appointment Cancelled</h1>
          <h3>Appointment ID: ${appointmentId}</h3>
          <p>Dear ${patient.name},</p>
          <p>We regret to inform you that your appointment has been cancelled.</p>
          <p><strong>Appointment Details:</strong></p>
          <ul>
            <li>Date & Time: ${scheduleDate.dateTime}</li>
            <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
            <li>Type: ${appointmentWithDetails.appointmenttype}</li>
            <li>Reason: ${appointmentWithDetails.reason}</li>
            <li>Cancellation Reason: ${cancellationReason}</li>
          </ul>
          <p>Please rebook your appointment if needed and manage your prescriptions from the portal.</p>
          <p>Thank you for choosing CarePulse!</p>
          <hr/>
          <p><strong>Team CarePulse</strong></p>
        `;
        text = `Your appointment has been cancelled. Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}. Reason: ${cancellationReason}`;
        break;

      case 'visited':
        subject = 'CarePulse - Visit Confirmed';
        html = `
          <h1>Visit Confirmed</h1>
          <h3>Appointment ID: ${appointmentId}</h3>
          <p>Dear ${patient.name},</p>
          <p>Your visit has been confirmed by the doctor.</p>
          <p><strong>Appointment Details:</strong></p>
          <ul>
            <li>Date & Time: ${scheduleDate.dateTime}</li>
            <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
            <li>Type: ${appointmentWithDetails.appointmenttype}</li>
            <li>Status: Visited</li>
          </ul>
          <p>You can now book another appointment if needed.</p>
          <p>Thank you for choosing CarePulse!</p>
          <hr/>
          <p><strong>Team CarePulse</strong></p>
        `;
        text = `Your visit has been confirmed. Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}`;
        break;

      case 'notVisited':
        subject = 'CarePulse - Visit Status Updated';
        html = `
          <h1>Visit Status Updated</h1>
          <h3>Appointment ID: ${appointmentId}</h3>
          <p>Dear ${patient.name},</p>
          <p>Your appointment status has been updated to "Not Visited".</p>
          <p><strong>Appointment Details:</strong></p>
          <ul>
            <li>Date & Time: ${scheduleDate.dateTime}</li>
            <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
            <li>Type: ${appointmentWithDetails.appointmenttype}</li>
            <li>Status: Not Visited</li>
          </ul>
          <p>If you have any concerns, please contact us.</p>
          <p>Thank you for choosing CarePulse!</p>
          <hr/>
          <p><strong>Team CarePulse</strong></p>
        `;
        text = `Your appointment status has been updated to "Not Visited". Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}`;
        break;

      case 'waitingList':
        subject = 'CarePulse - Moved from Waiting List';
        html = `
          <h1>Appointment Confirmed from Waiting List</h1>
          <h3>Appointment ID: ${appointmentId}</h3>
          <p>Dear ${patient.name},</p>
          <p>Great news! A slot has become available and your appointment has been confirmed!</p>
          <p><strong>Appointment Details:</strong></p>
          <ul>
            <li>Date & Time: ${scheduleDate.dateTime}</li>
            <li>Doctor: ${doctor?.name || 'Not Assigned'}</li>
            <li>Type: ${appointmentWithDetails.appointmenttype}</li>
            <li>Status: Scheduled</li>
          </ul>
          <p>Please visit the doctor at the scheduled time.</p>
          <p>Thank you for choosing CarePulse!</p>
          <hr/>
          <p><strong>Team CarePulse</strong></p>
        `;
        text = `Your appointment from waiting list has been confirmed. Appointment ID: ${appointmentId}. Date: ${scheduleDate.dateTime}`;
        break;
    }

    await sendEmail({
      to_email: patient.email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('Error sending appointment update email:', error);
    // Don't throw error - email failure shouldn't break the appointment update
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
      waitingListCount: 0,
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
          case "waitingList":
            acc.waitingListCount++;
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
      waitingListCount: 0,
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
          case "waitingList":
            acc.waitingListCount++;
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

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "scheduled",
    },
  });

  // Send email notification
  await sendAppointmentUpdateEmail(updatedAppointment, "accepted");

  return updatedAppointment;
};

export const cancelAppointment = async (appointmentId: string, cancellationReason?: string) => {
  revalidatePath("/admin", "page");
  revalidatePath("/patients", "page");
  console.log("cancel appointment", appointmentId);

  // Get appointment details before cancelling
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "cancelled",
      cancellationReason: cancellationReason || "Cancelled by admin",
    },
  });

  // Send email notification
  await sendAppointmentUpdateEmail(updatedAppointment, "cancelled", {
    cancellationReason: cancellationReason || "Cancelled by admin",
  });

  // If this was an online appointment, check for waiting list patients to assign
  if (appointment.appointmenttype === "online") {
    await assignWaitingListPatientToSlot(appointment.doctorId, appointment.schedule);
  }

  return updatedAppointment;
};

// CANCEL APPOINTMENT BY PATIENT (with emergency reason)
export const cancelAppointmentByPatient = async (appointmentId: string, isEmergency: boolean = false) => {
  try {
    // Check if appointment exists and is in the future
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Check if appointment is in the past
    const appointmentTime = new Date(appointment.schedule);
    const currentTime = new Date();

    if (appointmentTime < currentTime) {
      throw new Error("Cannot cancel past appointments");
    }

    // Check if appointment is already cancelled
    if (appointment.status === "cancelled") {
      throw new Error("Appointment is already cancelled");
    }

    // Only allow cancellation of pending or scheduled appointments
    if (appointment.status !== "pending" && appointment.status !== "scheduled") {
      throw new Error("Only pending or scheduled appointments can be cancelled");
    }

    const cancellationReason = isEmergency
      ? "Emergency cancellation by patient"
      : "Cancelled by patient";

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "cancelled",
        cancellationReason,
      },
    });

    // Send email notification
    await sendAppointmentUpdateEmail(updatedAppointment, "cancelled", {
      cancellationReason,
    });

    // If this was an online appointment, check for waiting list patients to assign
    if (appointment.appointmenttype === "online") {
      await assignWaitingListPatientToSlot(appointment.doctorId, appointment.schedule);
    }

    revalidatePath("/admin");
    revalidatePath("/patients");

    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    throw error;
  }
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
  hasVisited: boolean | null
) => {
  try {
    // Determine the new status based on hasVisited value
    let newStatus: string | undefined;
    if (hasVisited === true) {
      newStatus = "visited";
    } else if (hasVisited === false) {
      newStatus = "notVisited";
    }
    // If hasVisited is null, don't change the status

    // Build update data
    // hasVisited can be null, true, or false
    // Use conditional logic to handle null properly with Prisma types
    const updateData: { hasVisited?: boolean | null; status?: string } = {};

    // Set hasVisited (can be null, true, or false)
    if (hasVisited === null) {
      updateData.hasVisited = null;
    } else {
      updateData.hasVisited = hasVisited;
    }

    // Only update status if hasVisited is not null (yes or no)
    if (newStatus) {
      updateData.status = newStatus;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData as any, // Type assertion needed until Prisma types fully support null
    });

    if (!updatedAppointment) throw Error;

    // Send email notification if status changed to visited or notVisited
    if (newStatus === "visited") {
      await sendAppointmentUpdateEmail(updatedAppointment, "visited");
    } else if (newStatus === "notVisited") {
      await sendAppointmentUpdateEmail(updatedAppointment, "notVisited");
    }

    // Revalidate all relevant paths
    revalidatePath("/admin");
    revalidatePath("/doctors");
    revalidatePath("/patients");

    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error(
      "An error occurred while updating appointment visited status:",
      error
    );
  }
};

// Check if an appointment time slot is valid (within 2-hour window)
export const validateAppointmentTimeSlot = async (
  doctorId: string,
  scheduleDate: Date,
  appointmentType: string
): Promise<{
  isValid: boolean;
  message?: string;
  maxTime?: Date;
  isWaitingList?: boolean;
  isBookingClosed?: boolean;
  waitingListCount?: number;
}> => {
  // Check if the selected date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(scheduleDate);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return {
      isValid: false,
      message: "Cannot book appointment on past dates. Please select today or a future date.",
      isBookingClosed: true,
    };
  }

  if (appointmentType !== "online") {
    return { isValid: true };
  }

  try {
    const doctorStartTime = await getDoctorStartTime(doctorId, scheduleDate);

    if (!doctorStartTime) {
      return {
        isValid: false,
        message: "Doctor's start time not found for this day.",
      };
    }

    // Calculate 2-hour window end
    // doctorStartTime is already set to the correct date and time (e.g., 12/07/2025 4:00 AM)
    const twoHoursAfterStart = new Date(doctorStartTime);
    twoHoursAfterStart.setHours(twoHoursAfterStart.getHours() + 2);
    // twoHoursAfterStart is now 12/07/2025 6:00 AM

    // For online appointments, the selected time should be compared against the doctor's start time
    // The first user gets the doctor's start time, subsequent users get +10 minutes
    // So we need to check if the selected time is within the 2-hour window from doctor's start time
    // But we should use the doctor's start time as the base for validation, not the selected time

    // Normalize the selected time
    const selectedTime = new Date(scheduleDate);
    selectedTime.setSeconds(0, 0);
    selectedTime.setMilliseconds(0);

    // Normalize dates for comparison (extract date part only using local timezone)
    // Use local date components to avoid timezone issues
    const selectedLocalDate = new Date(selectedTime);
    const selectedYear = selectedLocalDate.getFullYear();
    const selectedMonth = selectedLocalDate.getMonth();
    const selectedDay = selectedLocalDate.getDate();

    const doctorStartLocalDate = new Date(doctorStartTime);
    const doctorYear = doctorStartLocalDate.getFullYear();
    const doctorMonth = doctorStartLocalDate.getMonth();
    const doctorDay = doctorStartLocalDate.getDate();

    // Get date strings for comparison (YYYY-MM-DD format)
    const selectedDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const doctorStartDateStr = `${doctorYear}-${String(doctorMonth + 1).padStart(2, '0')}-${String(doctorDay).padStart(2, '0')}`;

    console.log(`📅 Date validation for appointment:`);
    console.log(`   - Selected date (local): ${selectedDateStr} (Year: ${selectedYear}, Month: ${selectedMonth + 1}, Day: ${selectedDay})`);
    console.log(`   - Doctor start date (local): ${doctorStartDateStr} (Year: ${doctorYear}, Month: ${doctorMonth + 1}, Day: ${doctorDay})`);
    console.log(`   - Selected time: ${selectedTime.toISOString()} (${selectedTime.toLocaleString()})`);
    console.log(`   - Doctor start time: ${doctorStartTime.toISOString()} (${doctorStartTime.toLocaleString()})`);
    console.log(`   - Two hours after start: ${twoHoursAfterStart.toISOString()} (${twoHoursAfterStart.toLocaleString()})`);

    // For online appointments, check if the selected time is at or after the doctor's start time
    // The first user should get the doctor's start time, so we need to check if the selected time
    // is at least the doctor's start time (or within the 2-hour window)
    if (selectedDateStr === doctorStartDateStr) {
      // Same date - check if selected time is at or after doctor's start time
      if (selectedTime.getTime() < doctorStartTime.getTime()) {
        console.log(`   - ⚠️ Selected time (${selectedTime.toISOString()}) is before doctor's start time (${doctorStartTime.toISOString()})`);
        // If selected time is before doctor's start time, use doctor's start time for validation
        // This handles the case where the user hasn't selected a time yet or selected an invalid time
      }
    }

    // For today's appointments, also check if current time has passed the booking window
    // Compare using local date strings
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayDateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

    if (selectedDateStr === todayDateStr) {
      const now = new Date();
      console.log(`   - Current time: ${now.toISOString()}`);
      if (now > twoHoursAfterStart) {
        return {
          isValid: false,
          message: `Cannot book appointment. The booking window for today has closed. Maximum booking time was ${twoHoursAfterStart.toLocaleTimeString()} (2 hours from doctor's start time of ${doctorStartTime.toLocaleTimeString()}).`,
          maxTime: twoHoursAfterStart,
          isBookingClosed: true,
        };
      }
    }

    // For future dates, check if selected time is within the 2-hour window on that specific date
    // Compare using local date strings to avoid timezone issues
    // The selected date should match the doctor's available date
    if (selectedDateStr === doctorStartDateStr) {
      // Same date - check if selected time is within 2-hour window
      // For the first user, the selected time should be the doctor's start time
      // For subsequent users, it will be +10 minutes from the previous user (handled by queue calculation)
      // So we need to check if the selected time is at or after doctor's start time and within the 2-hour window

      // If selected time is before doctor's start time, it's invalid
      if (selectedTime.getTime() < doctorStartTime.getTime()) {
        console.log(`   - ❌ Selected time (${selectedTime.toISOString()}) is before doctor's start time (${doctorStartTime.toISOString()})`);
        return {
          isValid: false,
          message: `Cannot book appointment. Appointment time must be at or after doctor's start time of ${doctorStartTime.toLocaleTimeString()}.`,
          maxTime: twoHoursAfterStart,
          isBookingClosed: false,
        };
      }

      // Check if selected time exceeds the 2-hour window
      if (selectedTime.getTime() > twoHoursAfterStart.getTime()) {
        console.log(`   - ❌ Selected time (${selectedTime.toISOString()}) exceeds 2-hour window (${twoHoursAfterStart.toISOString()})`);
        console.log(`   - Selected time: ${selectedTime.getTime()}, Two hours after: ${twoHoursAfterStart.getTime()}, Difference: ${selectedTime.getTime() - twoHoursAfterStart.getTime()}ms`);
        return {
          isValid: false,
          message: `Cannot book appointment. Maximum booking time is ${twoHoursAfterStart.toLocaleTimeString()} (2 hours from doctor's start time of ${doctorStartTime.toLocaleTimeString()}).`,
          maxTime: twoHoursAfterStart,
          isBookingClosed: true,
        };
      } else {
        console.log(`   - ✅ Selected time (${selectedTime.toISOString()}) is within 2-hour window (from ${doctorStartTime.toISOString()} to ${twoHoursAfterStart.toISOString()})`);
        console.log(`   - Selected time: ${selectedTime.getTime()}, Doctor start: ${doctorStartTime.getTime()}, Two hours after: ${twoHoursAfterStart.getTime()}`);
      }
    } else {
      // Different date - this shouldn't happen if date picker is working correctly
      // But if it does, allow it (the date filter should handle this)
      console.warn(`⚠️ Selected date (${selectedDateStr}) doesn't match doctor's available date (${doctorStartDateStr})`);
      console.warn(`   - This might indicate a timezone or date parsing issue`);
      console.warn(`   - Selected time: ${selectedTime.toISOString()}, Doctor start time: ${doctorStartTime.toISOString()}`);
    }

    // Check queue and waiting list status
    const queueResult = await calculateOnlineAppointmentQueue(
      doctorId,
      scheduleDate,
      appointmentType
    );

    if (!queueResult.isValid) {
      // Check if waiting list is full
      // Waiting list appointments are scheduled after twoHoursAfterStart with 10-minute intervals
      const waitingListAppointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmenttype: "online",
          schedule: {
            gte: twoHoursAfterStart,
          },
          status: "waitingList",
        },
      });

      // Filter to same queue (10-minute intervals from twoHoursAfterStart)
      const normalizedTime = new Date(scheduleDate);
      normalizedTime.setSeconds(0, 0);
      normalizedTime.setMilliseconds(0);

      const sameQueueWaitingList = waitingListAppointments.filter((apt) => {
        const aptTime = new Date(apt.schedule);
        aptTime.setSeconds(0, 0);
        aptTime.setMilliseconds(0);
        const diffMinutes = (aptTime.getTime() - twoHoursAfterStart.getTime()) / (1000 * 60);
        return diffMinutes >= 0 && diffMinutes % 10 <= 1; // Allow small tolerance
      });

      if (sameQueueWaitingList.length >= 5) {
        return {
          isValid: false,
          message: "Booking is closed. The queue and waiting list are full for this time slot.",
          maxTime: twoHoursAfterStart,
          isBookingClosed: true,
          waitingListCount: 5,
        };
      }

      return {
        isValid: false,
        message: queueResult.message || "Cannot book appointment at this time.",
        maxTime: twoHoursAfterStart,
      };
    }

    // Check if this will be a waiting list appointment
    if (queueResult.isWaitingList) {
      // Count waiting list appointments for this queue
      const waitingListAppointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmenttype: "online",
          schedule: {
            gte: twoHoursAfterStart,
          },
          status: "waitingList",
        },
      });

      // Filter to same queue (10-minute intervals from twoHoursAfterStart)
      const sameQueueWaitingList = waitingListAppointments.filter((apt) => {
        const aptTime = new Date(apt.schedule);
        aptTime.setSeconds(0, 0);
        aptTime.setMilliseconds(0);
        const diffMinutes = (aptTime.getTime() - twoHoursAfterStart.getTime()) / (1000 * 60);
        return diffMinutes >= 0 && diffMinutes % 10 <= 1; // Allow small tolerance
      });

      return {
        isValid: true, // Allow booking, but show waiting list message
        maxTime: twoHoursAfterStart,
        isWaitingList: true,
        message: `Further bookings will be added to the waiting list. You will be notified when a slot becomes available. (${sameQueueWaitingList.length + 1}/5 in waiting list)`,
        waitingListCount: sameQueueWaitingList.length + 1,
      };
    }

    return {
      isValid: true,
      maxTime: twoHoursAfterStart,
    };
  } catch (error) {
    console.error("Error validating appointment time slot:", error);
    return {
      isValid: false,
      message: "Error validating appointment time. Please try again.",
    };
  }
};

// Cancel all online appointments that exceed the 2-hour window from doctor's start time
export const cancelAppointmentsExceedingTimeWindow = async () => {
  try {
    console.log("🔍 Checking for appointments exceeding 2-hour window...");

    // Get all online appointments that are not cancelled
    const onlineAppointments = await prisma.appointment.findMany({
      where: {
        appointmenttype: "online",
        status: {
          in: ["pending", "scheduled"], // Only check pending and scheduled appointments
        },
      },
      include: {
        doctor: {
          select: {
            id: true,
            availableTimingsOnline: true,
          },
        },
      },
    });

    console.log(`Found ${onlineAppointments.length} online appointments to check`);

    const cancelledAppointments: string[] = [];
    const errors: string[] = [];

    for (const appointment of onlineAppointments) {
      try {
        // Get doctor's start time for this appointment's day
        const doctorStartTime = await getDoctorStartTime(
          appointment.doctorId,
          appointment.schedule
        );

        if (!doctorStartTime) {
          console.warn(`Could not find doctor start time for appointment ${appointment.id}`);
          errors.push(`Appointment ${appointment.id}: Doctor start time not found`);
          continue;
        }

        // Calculate 2-hour window end
        const twoHoursAfterStart = new Date(doctorStartTime);
        twoHoursAfterStart.setHours(twoHoursAfterStart.getHours() + 2);

        // Check if appointment exceeds the 2-hour window
        if (appointment.schedule > twoHoursAfterStart) {
          console.log(`❌ Cancelling appointment ${appointment.id}:`);
          console.log(`   - Doctor start time: ${doctorStartTime.toISOString()}`);
          console.log(`   - 2-hour window ends: ${twoHoursAfterStart.toISOString()}`);
          console.log(`   - Appointment time: ${appointment.schedule.toISOString()}`);

          // Cancel the appointment
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              status: "cancelled",
              cancellationReason: "Automatically cancelled: Appointment time exceeds 2-hour booking window from doctor's start time.",
            },
          });

          cancelledAppointments.push(appointment.id);
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment.id}:`, error);
        errors.push(`Appointment ${appointment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Cleanup complete:`);
    console.log(`   - Cancelled appointments: ${cancelledAppointments.length}`);
    console.log(`   - Errors: ${errors.length}`);

    revalidatePath("/admin");

    return {
      success: true,
      cancelledCount: cancelledAppointments.length,
      cancelledAppointmentIds: cancelledAppointments,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error cancelling appointments exceeding time window:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
