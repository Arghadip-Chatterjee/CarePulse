import Image from "next/image";
import Link from "next/link";

import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { Button } from "@/components/ui/button";
import { getVerifiedDoctors } from "@/lib/actions/doctor.actions";
import { getPatient } from "@/lib/actions/patient.actions";


const Appointment = async ({ params: { userId } }: SearchParamProps) => {
  // Validate userId
  if (!userId || userId === "undefined") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">
            Invalid User ID
          </h1>
          <p className="text-lg mb-6">
            The user ID is missing or invalid. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const patient = await getPatient(userId);
  const doctorData = await getVerifiedDoctors();


  if (!patient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">
            Unauthorized Access
          </h1>
          <p className="text-lg mb-6">
            The patient ID is invalid or not found in our database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black-900">
      <div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <Image
              src="/assets/icons/logo-full.svg"
              height={1000}
              width={1000}
              alt="logo"
              className="h-10 w-fit"
            />
            <Link href={`/patients/${userId}/console`}>
              <Button variant="outline" className="text-sm">
                Back to Console
              </Button>
            </Link>
          </div>

          {/* Form Section */}
          <div className="rounded-lg bg-black-800 p-6 shadow-lg md:p-8 lg:p-10">
            <AppointmentForm
              patientId={patient?.id}
              userId={userId}
              type="create"
              doctors={doctorData || []}
            />
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-dark-500">
            © 2024 CarePulse. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Appointment;
