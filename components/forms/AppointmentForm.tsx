"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// import Image from "next/image";
import { useRouter } from "next/navigation";

import { Dispatch,SetStateAction,useState } from "react";

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
      meeting : "",
    },
  });

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
          meeting : "",
          // Note: submissionId will be logged but not stored in DB until schema is updated
        };
  
        console.log("Appointment data being sent:", appointment);
        console.log("Submission ID:", currentSubmissionId);
  
        const newAppointment = await createAppointment(appointment, currentSubmissionId);
        console.log("✅ Appointment created successfully:", newAppointment);
  
        if (newAppointment) {
          form.reset();
          router.push(
            `/patients/${userId}/new-appointment/success?appointmentId=${newAppointment.$id}`
          );
        } else {
          alert("Failed to create appointment. Please try again.");
        }
      } else {
        const appointmentToUpdate = {
          userId,
          appointmentId: appointment?.$id!,
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
                      doctorId: doctor.userId,
                      doctorName: doctor.name,
                    })}
                  >
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="schedule"
              label="Expected appointment date"
              showTimeSelect
              dateFormat="MM/dd/yyyy  -  h:mm aa"
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
