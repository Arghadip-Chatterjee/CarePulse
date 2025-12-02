"use client";

import { ColumnDef } from "@tanstack/react-table";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  acceptAppointment,
  sendSMSNotification,
  sendEmail,
  cancelAppointment,
  cancelAppointmentByPatient,
  updateAppointmentVisitedStatus,
} from "@/lib/actions/appointment.actions";
import { verifyDoctor } from "@/lib/actions/doctor.actions";


import { formatDateTime } from "@/lib/utils";
import { Appointment, Doctor, Prescription } from "@/types/appwrite.types";


import { StatusBadge } from "../StatusBadge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "@/components/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Component for Doctor Details Cell
const DoctorDetailsCell = ({ appointment }: { appointment: Appointment }) => {
  const [doctorData, setDoctorData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [DoctorModal, setDoctorModal] = useState<any>(null);

  useEffect(() => {
    import("@/components/DoctorDetailsModal").then((mod) => {
      setDoctorModal(() => mod.DoctorDetailsModal);
    });
  }, []);

  const fetchDoctorDetails = async () => {
    if (doctorData) {
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const { getDoctorById } = await import("@/lib/actions/doctor.actions");
      const doctor = await getDoctorById(appointment.doctorId);
      setDoctorData(doctor);
      setIsOpen(true);
    } catch (error) {
      console.error("Error fetching doctor details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!DoctorModal) {
    return <p className="text-14-medium text-dark-700">Loading...</p>;
  }

  return (
    <>
      <Button
        onClick={fetchDoctorDetails}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
      >
        {isLoading ? "Loading..." : "View Doctor"}
      </Button>

      {doctorData && (
        <DoctorModal
          doctor={doctorData}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

// Component for Admin Actions Cell
const AdminActionsCell = ({ appointment }: { appointment: Appointment }) => {
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      await acceptAppointment(appointment.id);
      const date = formatDateTime(appointment.schedule).dateTime;
      await sendSMSNotification(
        appointment.userId,
        `Your appointment with ${appointment.doctor} has been Accepted at ${date}. Apppintment ID : ${appointment.id}.Check Mail for Further Updates`
      );
      
      toast({
        title: "Success",
        description: "Appointment accepted successfully!",
        variant: "default",
      });

      const templateParams = {
        to_email: `${appointment.patient.email}`,
        subject: "CarePulse Appointment Update",
        text: `Your appointment has been Booked with Doctor ${appointment.doctor} .`,
        html: `
        <h1>Appointment Update</h1>
        <h3> Appointment ID : ${appointment.id} </h3>
        <p>Your appointment has been Booked with Doctor ${appointment.doctor} in ${appointment.appointmenttype} mode at ${date} </p>
        <p>Please visit the doctor at the scheduled time and manage your Prescriptions from the Portal.</p>
        <h4>Thank You for Choosing CarePulse</h4>
        <hr/>
        <h4>Team CarePulse</h4>
        `,
      };

      await sendEmail(templateParams);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelAppointment(appointment.id);
      const date = formatDateTime(appointment.schedule).dateTime;
      await sendSMSNotification(
        appointment.userId,
        `Your appointment with ${appointment.doctor} has been Cancelled at ${date}. Apppintment ID : ${appointment.id}.Check Mail for Further Updates`
      );
      
      toast({
        title: "Success",
        description: "Appointment cancelled successfully!",
        variant: "default",
      });

      const templateParams = {
        to_email: `${appointment.patient.email}`,
        subject: "CarePulse Appointment Update",
        text: `Your appointment has been Cancelled with Doctor ${appointment.doctor} .`,
        html: `
        <h1>Appointment Update</h1>
        <h3> Appointment ID : ${appointment.id} </h3>
        <p>Your appointment has been Cancelled with Doctor ${appointment.doctor} in ${appointment.appointmenttype} mode at ${date} </p>
        <p>Please Rebook Your Appointment and manage your Prescriptions from the Portal.</p>
        <h4>Thank You for Choosing CarePulse</h4>
        <hr/>
        <h4>Team CarePulse</h4>
        `,
      };

      await sendEmail(templateParams);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Only show actions if the schedule is pending
  if (appointment.status === "pending") {
    return (
      <div className="flex gap-2 pl-4">
        <Button
          onClick={handleAccept}
          className="px-3 py-2 text-xs text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Accept
        </Button>
        <Button
          onClick={handleCancel}
          className="px-3 py-2 text-xs text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return null;
};

// Component for Patient Actions Cell
const PatientActionsCell = ({ appointment }: { appointment: Appointment }) => {
  const { toast } = useToast();
  const scheduledTime = new Date(appointment.schedule);
  const currentTime = new Date();
  const isFutureAppointment = scheduledTime > currentTime;
  const canCancel = isFutureAppointment && 
                   (appointment.status === "pending" || appointment.status === "scheduled");

  const handleEmergencyCancel = async () => {
    if (!confirm(
      "Are you cancelling due to an emergency? This action cannot be undone."
    )) {
      return;
    }

    try {
      await cancelAppointmentByPatient(appointment.id, true);
      toast({
        title: "Success",
        description: "Appointment cancelled successfully due to emergency!",
        variant: "default",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!canCancel) {
    return null;
  }

  return (
    <Button
      onClick={handleEmergencyCancel}
      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs"
      size="sm"
    >
      Emergency Cancel
    </Button>
  );
};

// Component for Meeting Cell
const MeetingCell = ({ appointment }: { appointment: Appointment }) => {
  const router = useRouter();
  const scheduledTime = new Date(appointment.schedule);
  const currentTime = new Date();

  // Meeting is available 15 minutes before scheduled time
  const meetingStartTime = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
  // Meeting expires 2 hours after scheduled time
  const meetingEndTime = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000);

  const isTooEarly = currentTime < meetingStartTime;
  const isExpired = currentTime > meetingEndTime;
  const isAvailable = !isTooEarly && !isExpired;

  const handleMeeting = async () => {
    router.push(
      `/video?appointmentId=${appointment.id}&userId=${appointment.userId}&roomID=${appointment.id}`
    );
  };

  if (appointment.appointmenttype === "online" && appointment.status === "scheduled") {
    const button = !appointment.meeting ? (
      <Button
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
        onClick={handleMeeting}
        disabled={!isAvailable}
      >
        Start Meeting
      </Button>
    ) : (
      <Link
        href={appointment.meeting}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
          disabled={!isAvailable}
        >
          View Meeting
        </Button>
      </Link>
    );

    // Show different tooltips based on timing
    if (isTooEarly) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p className="text-white">Meeting available 15 minutes before scheduled time</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (isExpired) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p className="text-white">This meeting has expired</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return button;
    }
  } else {
    return <p className="text-14-medium text-white">Not Available</p>;
  }
};

export const columns: ColumnDef<Appointment>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium ">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium ">{appointment.patient.name}</p>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="min-w-[115px]">
          <StatusBadge status={appointment.status} />
        </div>
      );
    },
  },
  {
    accessorKey: "schedule",
    header: "Appointment",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-regular min-w-[100px]">
          {formatDateTime(appointment.schedule).dateTime}
        </p>
      );
    },
  },

  {
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      return <AdminActionsCell appointment={row.original} />;
    },
  },
];

// Define columns for doctors DataTable
export const doctorColumns: ColumnDef<Doctor>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "specialization",
    header: "Specialization",
    cell: ({ row }) => row.original.specialization || "N/A",
  },
  {
    accessorKey: "isVerified",
    header: "Status",
    cell: ({ row }: { row: { original: { isVerified: boolean } } }) => {
      const doctorStatus: Status = row.original.isVerified
        ? "verified"
        : "unverified";

      return (
        <div className="min-w-[115px]">
          <StatusBadge status={doctorStatus} />
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) =>
      !row.original.isVerified && (
        <Button
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
          onClick={() => verifyDoctor(row.original.id)}
        >
          Verify
        </Button>
      ),
  },
];

export const columns1: ColumnDef<Appointment>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium ">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium ">{appointment.patient.name}</p>;
    },
  },
  {
    accessorKey: "doctor",
    header: "Doctor",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium ">{appointment.doctor}</p>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="min-w-[115px]">
          <StatusBadge status={appointment.status} />
        </div>
      );
    },
  },
  {
    accessorKey: "schedule",
    header: "Appointment",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-regular min-w-[100px]">
          {formatDateTime(appointment.schedule).dateTime}
        </p>
      );
    },
  },
  {
    accessorKey: "appointmenttype",
    header: "AppointmentType",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium ">{appointment.appointmenttype}</p>;
    },
  },
  {
    accessorKey: "appointmentID",
    header: "AppointmentID",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium ">{appointment.id}</p>;
    },
  },

  {
    accessorKey: "hasVisited",
    header: "Has Visited",
    cell: ({ row }) => {
      const appointment = row.original;
      
      // Determine default value based on status first, then hasVisited
      // If status is "visited", show "Yes"
      // If status is "notVisited", show "No"
      // Otherwise, default to "null"
      let defaultValue = "null";
      if (appointment.status === "visited") {
        defaultValue = "yes";
      } else if (appointment.status === "notVisited") {
        defaultValue = "no";
      } else if (appointment.hasVisited !== null && appointment.hasVisited !== undefined) {
        // Fallback to hasVisited value if status doesn't indicate visited/notVisited
        defaultValue = appointment.hasVisited ? "yes" : "no";
      }
      
      // Check if appointment date has arrived (today or in the past)
      const appointmentDate = new Date(appointment.schedule);
      appointmentDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isAppointmentDateArrived = appointmentDate <= today;
      
      // Disable dropdown if:
      // 1. Status is "pending", "cancelled", or "waitingList"
      // 2. Status is "scheduled" but appointment date is in the future
      // Enable only if: status is "scheduled" AND appointment date has arrived (today or past)
      const isDisabled = 
        appointment.status === "pending" || 
        appointment.status === "cancelled" || 
        appointment.status === "waitingList" ||
        (appointment.status === "scheduled" && !isAppointmentDateArrived);
      
      return (
        <div className="flex items-center gap-2">
          <Select
            onValueChange={async (value) => {
              await updateAppointmentVisitedStatus(
                appointment.id,
                value === "yes" ? true : value === "no" ? false : null
              );
            }}
            defaultValue={defaultValue}
            disabled={isDisabled}
          >
            <SelectTrigger className={`shad-select-trigger ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="shad-select-content">
              <SelectItem value="null">Null</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    accessorKey: "doctorDetails",
    header: "Doctor Details",
    cell: ({ row }) => {
      return <DoctorDetailsCell appointment={row.original} />;
    },
  },
  {
    accessorKey: "meeting",
    header: "Meeting",
    cell: ({ row }) => {
      return <MeetingCell appointment={row.original} />;
    },
  },
  {
    id: "patientActions",
    header: "Actions",
    cell: ({ row }) => {
      const appointment = row.original;
      const scheduledTime = new Date(appointment.schedule);
      const currentTime = new Date();
      const isFutureAppointment = scheduledTime > currentTime;
      const canCancel = isFutureAppointment && 
                       (appointment.status === "pending" || appointment.status === "scheduled");

      const handleEmergencyCancel = async () => {
        if (!confirm(
          "Are you cancelling due to an emergency? This action cannot be undone."
        )) {
          return;
        }

        try {
          await cancelAppointmentByPatient(appointment.id, true);
          // Toast will be shown by PatientActionsCell component
          window.location.reload();
        } catch (error: any) {
          // Toast will be shown by PatientActionsCell component
          console.error("Error cancelling appointment:", error);
        }
      };

      if (!canCancel) {
        return null;
      }

      return (
        <Button
          onClick={handleEmergencyCancel}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs"
          size="sm"
        >
          Emergency Cancel
        </Button>
      );
    },
  }
];

export const prescriptionColumns: ColumnDef<Prescription>[] = [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium ">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const prescription = row.original;
      return <p className="text-14-medium ">{prescription.user_id}</p>;
    },
  },
  {
    accessorKey: "prescription",
    header: "Prescription",
    cell: ({ row }) => {
      const prescription = row.original;
      return (
        <div className="flex items-center">
          <Link
            href={prescription.prescription_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline truncate max-w-md"
          >
            {prescription.prescription_url}
          </Link>
        </div>
      );
    },
  },
  {
    accessorKey: "uploaded_at",
    header: "Uploaded At",
    cell: ({ row }) => {
      const prescription = row.original;
      return (
        <p className="text-14-medium">
          {formatDateTime(prescription.uploaded_at).dateTime}
        </p>
      );
    },
  },
];
