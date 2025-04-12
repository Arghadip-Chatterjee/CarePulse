import Image from "next/image";
// import { getPatient } from "@/lib/actions/patient.actions";
import { getDoctor } from "@/lib/actions/doctor.actions";
import { StatCard } from "@/components/StatCard";
import { columns, columns1, doctorColumns } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { getAppointmentListByUserId } from "@/lib/actions/appointment.actions";
// import { Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const DoctorConsole = async ({ params: { userId } }: SearchParamProps) => {
  const doctor = await getDoctor(userId);
  console.log(doctor);
  const appointments = await getAppointmentListByUserId(userId);
  console.log(appointments);

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

          <p className="text-16-semibold">Patient Dashboard</p>
        </div>
      </header>

      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome {doctor.name} </h1>
          <p className="text-dark-700">
            Start the day with managing new appointments
          </p>
        </section>

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
        </section>

        <DataTable columns={doctorColumns} data={appointments.documents} />
      </main>
    </div>
  );
};

export default DoctorConsole;
