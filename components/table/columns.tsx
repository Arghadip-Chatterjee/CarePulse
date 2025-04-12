"use client";

import { ColumnDef } from "@tanstack/react-table";
// import Image from "next/image";
import Link from "next/link";

// import { Doctors } from "@/constants";
import { formatDateTime } from "@/lib/utils";
import { Appointment, Doctor, Prescription } from "@/types/appwrite.types";

import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";
import { Button } from "../ui/button";
// import { toast } from "sonner";

import {
  acceptAppointment,
  sendSMSNotification,
} from "@/lib/actions/appointment.actions";
import { cancelAppointment } from "@/lib/actions/appointment.actions";

import { verifyDoctor } from "@/lib/actions/doctor.actions";
import { ToastSimple } from "@/components/Toast";
// import { revalidatePath } from "next/cache";
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
      const appointment = row.original;

      const handleAccept = async () => {
        // You can customize this function or trigger an API call here
        await acceptAppointment(appointment.$id);

        await sendSMSNotification(
          appointment.userId,
          `Your appointment with ${appointment.patient.name} has been Accepted.`
        );
        // revalidatePath("/admin");
      };

      const handleCancel = async () => {
        // You can customize this function or trigger an API call here
        await cancelAppointment(appointment.$id);
        // toast.success("Appointment cancelled");
        await sendSMSNotification(
          appointment.userId,
          `Your appointment with ${appointment.patient.name} has been Cancelled.`
        );
        // revalidatePath("/admin");
      };

      return (
        <div className="flex gap-2 pl-4">
          <button
            onClick={handleAccept}
            className="px-3 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Accept
          </button>
          <ToastSimple
            buttonLabel="Cancel"
            toastDescription="Appointment Cancelled Successfully!"
          />
        </div>
      );
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
          onClick={() => verifyDoctor(row.original.$id)}
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
      return <p className="text-14-medium ">{prescription.userId}</p>;
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
