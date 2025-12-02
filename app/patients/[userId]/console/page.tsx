import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import { StatCard } from "@/components/StatCard";
import { columns1 } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { getAppointmentListByUserId, cancelAppointmentsExceedingTimeWindow } from "@/lib/actions/appointment.actions";
import { getPatient } from "@/lib/actions/patient.actions";
import { getConsultationsByUserId } from "@/lib/actions/ai.actions";
import { AIConsultationList } from "@/components/AIConsultationList";
import { PatientDetailsCard } from "@/components/PatientDetailsCard";

const PatientConsole = async ({ params: { userId } }: SearchParamProps) => {
  // Cancel any existing appointments that exceed the 2-hour window
  await cancelAppointmentsExceedingTimeWindow();

  const patient = await getPatient(userId);
  console.log(patient);
  const appointments = await getAppointmentListByUserId(userId);
  console.log(appointments);

  const aiConsultationsResult = await getConsultationsByUserId(userId);
  const aiConsultations = aiConsultationsResult.success ? aiConsultationsResult.consultations : [];

  revalidatePath(`/patients/${userId}/console`);

  if (!patient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">
            Unauthorized Access
          </h1>
          <p className="text-lg mb-6">
            The Patient ID is invalid or not found in our database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-14">
      <header className="admin-header">
        <Link href="/" className="cursor-pointer">
          <Image
            src="/assets/icons/logo-full.svg"
            height={32}
            width={162}
            alt="logo"
            className="h-8 w-fit"
          />
        </Link>

        <div className="flex items-center gap-4 justify-center">
          <Link href={`/patients/${userId}/new-appointment`}>
            <Button className="">New Appointment</Button>
          </Link>

          <Link href={`/patients/${userId}/ai-consult`}>
            <Button className="bg-green-600 hover:bg-green-700">AI Consult</Button>
          </Link>

          <Link href={`/patients/${userId}/prescription`}>
            <Button className="">Prescription Upload</Button>
          </Link>

          <p className="text-16-semibold">Patient Dashboard</p>
        </div>
      </header>

      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome {patient.name} </h1>
          <p className="text-dark-700">
            Start the day with managing new appointments
          </p>
        </section>

        {/* Patient Details Section */}
        <PatientDetailsCard patient={patient} userId={userId} />

        <section className="admin-stat">
          <StatCard
            type="appointments"
            count={appointments.scheduledCount}
            label="Scheduled appointments"
            icon={"/assets/icons/appointments.svg"}
          />
          <StatCard
            type="pending"
            count={appointments.pendingCount}
            label="Pending appointments"
            icon={"/assets/icons/pending.svg"}
          />
          <StatCard
            type="cancelled"
            count={appointments.cancelledCount}
            label="Cancelled appointments"
            icon={"/assets/icons/cancelled.svg"}
          />
          <StatCard
            type="pending"
            count={appointments.waitingListCount || 0}
            label="Waiting List"
            icon={"/assets/icons/pending.svg"}
          />
        </section>

        <DataTable columns={columns1} data={appointments.documents} />

        <section className="w-full space-y-4 pt-10">
          <h2 className="header">AI Consultation History</h2>
          <p className="text-dark-700">
            Review your past consultations and summaries
          </p>
          <AIConsultationList consultations={aiConsultations} />
        </section>
      </main>
    </div>
  );
};

export default PatientConsole;
