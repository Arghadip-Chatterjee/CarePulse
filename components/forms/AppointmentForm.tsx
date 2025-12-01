"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// import Image from "next/image";
import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useState, useMemo, useEffect } from "react";

import { useForm } from "react-hook-form";

import { z } from "zod";

import {
  SelectItem,
  // Select,
  SelectContent,
  // SelectTrigger,
  // SelectValue,
} from "@/components/ui/select";

import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointment.actions";
import { getAppointmentSchema } from "@/lib/validation";

import { Appointment } from "@/types/appwrite.types";

import "react-datepicker/dist/react-datepicker.css";

import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";

import { Form } from "../ui/form";

export const AppointmentForm = ({
  userId,
  patientId,
  type = "create",
  appointment,
  setOpen,
  doctors, // Doctors are now passed as props
}: {
  userId: string;
  patientId: string;
  type: "create" | "schedule" | "cancel";
  appointment?: Appointment;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  doctors: any; // Doctors data from the server
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const AppointmentFormValidation = getAppointmentSchema(type);

  const form = useForm<z.infer<typeof AppointmentFormValidation>>({
    resolver: zodResolver(AppointmentFormValidation),
    defaultValues: {
      doctor: appointment?.doctor || "",
      schedule: appointment
        ? new Date(appointment?.schedule!)
        : new Date(Date.now()),
      reason: appointment ? appointment.reason : "",
      note: appointment?.note || "",
      cancellationReason: appointment?.cancellationReason || "",
      appointmenttype: "online",
      doctorId: appointment?.doctorId || "",
      prescription: [],
      meeting: "",
    },
  });

  // Watch for doctor and appointment type changes
  const watchedDoctor = form.watch("doctor");
  const watchedAppointmentType = form.watch("appointmenttype");

  // Update selected doctor when doctor field changes
  useEffect(() => {
    if (watchedDoctor) {
      try {
        const doctorInfo = JSON.parse(watchedDoctor);
        const doctor = doctors.find((d: any) => d.id === doctorInfo.doctorId);
        setSelectedDoctor(doctor);
      } catch (error) {
        setSelectedDoctor(null);
      }
    } else {
      setSelectedDoctor(null);
    }
  }, [watchedDoctor, doctors]);

  // Get available timings based on appointment type
  const availableTimings = useMemo(() => {
    if (!selectedDoctor) return [];

    const timings = watchedAppointmentType === "online"
      ? selectedDoctor.availableTimingsOnline
      : selectedDoctor.availableTimingsOffline;

    return timings || [];
  }, [selectedDoctor, watchedAppointmentType]);

  // Parse timing string (e.g., "Monday: 10:00 AM") into day and time
  const parseTimingString = (timing: string) => {
    const parts = timing.split(":");
    if (parts.length < 2) return { day: "", time: "" };

    const day = parts[0].trim();
    const time = parts.slice(1).join(":").trim();
    return { day, time };
  };

  // Get available time for a specific day
  const getTimeForDay = (dayName: string) => {
    const timing = availableTimings.find((t: string) => {
      const { day } = parseTimingString(t);
      return day === dayName;
    });

    if (timing) {
      const { time } = parseTimingString(timing);
      return time;
    }
    return null;
  };

  // Filter dates - only allow days that match available timings
  const filterDate = (date: Date) => {
    if (availableTimings.length === 0) return true;

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return availableTimings.some((timing: string) => {
      const { day } = parseTimingString(timing);
      return day === dayName;
    });
  };

  // Handle date selection - automatically set time based on doctor's availability
  const handleDateChange = (date: Date) => {
    if (!date) {
      form.setValue("schedule", date);
      return;
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const availableTime = getTimeForDay(dayName);

    if (availableTime) {
      // Parse the time string (e.g., "10:00 AM") and set it on the date
      const timeParts = availableTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const meridiem = timeParts[3].toUpperCase();

        // Convert to 24-hour format
        if (meridiem === "PM" && hours !== 12) {
          hours += 12;
        } else if (meridiem === "AM" && hours === 12) {
          hours = 0;
        }

        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        form.setValue("schedule", newDate);
      } else {
        form.setValue("schedule", date);
      }
    } else {
      form.setValue("schedule", date);
    }
  };

  const onSubmit = async (
    values: z.infer<typeof AppointmentFormValidation>
  ) => {
    // Prevent double submission
    if (isLoading || isSubmitted) {
      console.log("Form is already submitting or submitted, ignoring duplicate submission");
      return;
    }

    const currentSubmissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setSubmissionId(currentSubmissionId);
    setIsLoading(true);
    setIsSubmitted(true);
    console.log("🚀 Starting appointment creation with submission ID:", currentSubmissionId);

    let status;
    switch (type) {
      case "schedule":
        status = "scheduled";
        break;
      case "cancel":
        status = "cancelled";
        break;
      default:
        status = "pending";
    }

    try {
      if (type === "create" && patientId) {
        const doctorInfo = JSON.parse(values.doctor);

        console.log("Doctor Info", doctorInfo);
        const appointment: any = {
          userId,
          patient: patientId,
          doctor: doctorInfo.doctorName,
          schedule: new Date(values.schedule),
          reason: values.reason!,
          status: status as Status,
          note: values.note,
          appointmenttype: values.appointmenttype,
          doctorId: doctorInfo.doctorId,
          prescription: values.prescription,
          meeting: "",
          // Note: submissionId will be logged but not stored in DB until schema is updated
        };

        console.log("Appointment data being sent:", appointment);
        console.log("Submission ID:", currentSubmissionId);

        const newAppointment = await createAppointment(appointment, currentSubmissionId);
        console.log("✅ Appointment created successfully:", newAppointment);

        if (newAppointment) {
          form.reset();
          router.push(
            `/patients/${userId}/new-appointment/success?appointmentId=${newAppointment.id}`
          );
        } else {
          alert("Failed to create appointment. Please try again.");
        }
      } else {
        const appointmentToUpdate = {
          userId,
          appointmentId: appointment?.id!,
          appointment: {
            primaryPhysician: values.doctor,
            schedule: new Date(values.schedule),
            status: status as Status,
            cancellationReason: values.cancellationReason,
          },
          type,
        };

        const updatedAppointment = await updateAppointment(appointmentToUpdate);

        if (updatedAppointment) {
          setOpen && setOpen(false);
          form.reset();
        }
      }
    } catch (error: any) {
      console.error("❌ Appointment creation failed:", error);

      // Provide more specific error messages
      if (error?.message?.includes("already exists")) {
        alert(error.message);
      } else if (error?.code === 409) {
        alert("An appointment with these details already exists. Please check the date, time, doctor, or patient selection.");
      } else if (error?.message?.includes("Document with the requested ID already exists")) {
        alert("There was a conflict creating the appointment. Please try again.");
      } else {
        alert("An error occurred while creating the appointment. Please try again.");
      }
    } finally {
      // Always reset loading state
      setIsLoading(false);
      console.log("🔄 Form submission completed, loading state reset");
    }
  };
  let buttonLabel;
  switch (type) {
    case "cancel":
      buttonLabel = "Cancel Appointment";
      break;
    case "schedule":
      buttonLabel = "Schedule Appointment";
      break;
    default:
      buttonLabel = "Submit Apppointment";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        {type === "create" && (
          <section className="mb-12 space-y-4">
            <h1 className="header">New Appointment</h1>
            <p className="text-dark-700">
              Request a new appointment in 10 seconds.
            </p>
          </section>
        )}

        {type !== "cancel" && (
          <>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="doctor"
              label="Doctor"
              placeholder="Select a doctor"
            >
              <SelectContent className="shad-select-content">
                {doctors.map((doctor: any) => (
                  <SelectItem
                    key={doctor.id}
                    value={JSON.stringify({
                      doctorId: doctor.id,
                      doctorName: doctor.name,
                    })}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{doctor.name}</span>
                      <span className="text-xs text-dark-600">{doctor.specialization}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </CustomFormField>

            {/* Display Selected Doctor Details */}
            {selectedDoctor && (
              <div className="bg-dark-400 border border-dark-500 rounded-lg p-6 mt-4">
                <h3 className="text-18-bold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Doctor Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-14-regular text-dark-700 mb-1">Name</p>
                    <p className="text-16-semibold text-white">{selectedDoctor.name}</p>
                  </div>
                  <div>
                    <p className="text-14-regular text-dark-700 mb-1">Specialization</p>
                    <p className="text-16-semibold text-green-500">{selectedDoctor.specialization}</p>
                  </div>
                  <div>
                    <p className="text-14-regular text-dark-700 mb-1">Experience</p>
                    <p className="text-16-semibold text-white">{selectedDoctor.yearsOfExperience} years</p>
                  </div>
                  <div>
                    <p className="text-14-regular text-dark-700 mb-1">Hospital</p>
                    <p className="text-16-semibold text-white">{selectedDoctor.hospitalAffiliation}</p>
                  </div>
                  <div>
                    <p className="text-14-regular text-dark-700 mb-1">Consultation Fee</p>
                    <p className="text-16-semibold text-white">₹{selectedDoctor.consultationFee}</p>
                  </div>
                  <div>
                    <p className="text-14-regular text-dark-700 mb-1">License Number</p>
                    <p className="text-16-semibold text-white">{selectedDoctor.licenseNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Display Doctor's Available Timings */}
            {selectedDoctor && availableTimings.length > 0 && (
              <div className="bg-dark-400 border border-dark-500 rounded-lg p-4 mt-4">
                <h3 className="text-16-semibold mb-3 text-white">
                  Available Timings ({watchedAppointmentType === "online" ? "Online" : "Offline"})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableTimings.map((timing: string, index: number) => (
                    <div
                      key={index}
                      className="bg-dark-300 px-3 py-2 rounded-md text-14-regular text-green-500"
                    >
                      {timing}
                    </div>
                  ))}
                </div>
                <p className="text-12-regular text-dark-700 mt-3">
                  Please select a date and time that matches the available slots above.
                </p>
              </div>
            )}

            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="schedule"
              label="Expected appointment date"
              showTimeSelect={false}
              dateFormat="MM/dd/yyyy"
              filterDate={filterDate}
              onDateChange={handleDateChange}
            />
            <div
              className={`flex flex-col gap-6  ${type === "create" && "xl:flex-row"}`}
            >
              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="reason"
                label="Appointment reason"
                placeholder="Annual montly check-up"
                disabled={type === "schedule"}
              />

              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="note"
                label="Comments/notes"
                placeholder="Prefer afternoon appointments, if possible"
                disabled={type === "schedule"}
              />
            </div>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="appointmenttype"
              label="Appointment type"
              placeholder="Select appointment type"
            >
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </CustomFormField>
          </>
        )}

        {type === "cancel" && (
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="cancellationReason"
            label="Reason for cancellation"
            placeholder="Urgent meeting came up"
          />
        )}

        <SubmitButton
          isLoading={isLoading}
          className={`${type === "cancel" ? "shad-danger-btn" : "shad-primary-btn"} w-full`}
        >
          {buttonLabel}
        </SubmitButton>
      </form>
    </Form>
  );
};
