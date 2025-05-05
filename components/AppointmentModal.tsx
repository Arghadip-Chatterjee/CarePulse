"use client";

import { useState, startTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  acceptAppointment,
  cancelAppointment,
  sendSMSNotification,
} from "@/lib/actions/appointment.actions";
import { Appointment } from "@/types/appwrite.types";

// import { sendSMSNotification } from "@/lib/actions/appointment.actions"; // Your SMS util

export const AppointmentModal = ({
  patientId,
  userId,
  appointment,
  type,
  title,
  description,
}: {
  patientId: string;
  userId: string;
  appointment?: Appointment;
  type: "schedule" | "cancel";
  title: string;
  description: string;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!appointment) return;
    setLoading(true);

    try {
      if (type === "schedule") {
        await acceptAppointment(appointment.$id);
        await sendSMSNotification(
          userId,
          `Your appointment with ${appointment.patient.name} has been accepted.`
        );
        toast.success("Appointment accepted");
      } else if (type === "cancel") {
        await cancelAppointment(appointment.$id);
        await sendSMSNotification(
          userId,
          `Your appointment with ${appointment.patient.name} has been cancelled.`
        );
        toast.success("Appointment cancelled");
      }

      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={`capitalize ${
            type === "schedule" ? "text-green-500" : "text-red-500"
          }`}
        >
          {type}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            variant={type === "schedule" ? "default" : "destructive"}
            onClick={() => startTransition(handleAction)}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : type === "schedule"
                ? "Accept"
                : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
