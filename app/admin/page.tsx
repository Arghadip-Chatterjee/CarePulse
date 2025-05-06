import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import {
  columns as appointmentColumns,
  doctorColumns,
} from "@/components/table/columns";

import { DataTable } from "@/components/table/DataTable";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";
import { getDoctorsList } from "@/lib/actions/doctor.actions";

const AdminPage = async () => {
  const appointments = await getRecentAppointmentList();
  const doctors = await getDoctorsList();

  revalidatePath("/admin", "page");

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
        <p className="text-16-semibold">Admin Dashboard</p>
      </header>

      <main className="admin-main">
        {/* Welcome Section */}
        <section className="w-full space-y-4">
          <h1 className="header">Welcome 👋</h1>
          <p className="text-dark-700">
            Start the day with managing new appointments and verifying doctors.
          </p>
        </section>

        {/* Statistics Section */}
        <section className="admin-stat">
          {/* Appointments Stats */}
          <StatCard
            type="appointments"
            count={appointments.scheduledCount}
            label="Scheduled appointments"
            icon="/assets/icons/appointments.svg"
          />
          <StatCard
            type="pending"
            count={appointments.pendingCount}
            label="Pending appointments"
            icon="/assets/icons/pending.svg"
          />
          <StatCard
            type="cancelled"
            count={appointments.cancelledCount}
            label="Cancelled appointments"
            icon="/assets/icons/cancelled.svg"
          />

          {/* Doctors Stats */}
          <StatCard
            type="doctors"
            count={doctors.totalCount}
            label="Total Doctors"
            icon="/assets/icons/doctors.svg"
          />
          <StatCard
            type="verified"
            count={doctors.verifiedCount}
            label="Verified Doctors"
            icon="/assets/icons/verified.svg"
          />
          <StatCard
            type="unverified"
            count={doctors.unverifiedCount}
            label="Pending Verification"
            icon="/assets/icons/pending.svg"
          />
        </section>

        {/* Appointments Table */}
        <DataTable columns={appointmentColumns} data={appointments.documents} />

        {/* Doctors Table */}
        <section className="admin-doctors w-full">
          <h2 className="text-xl font-semibold mb-4">Doctors Verification</h2>
          <DataTable columns={doctorColumns} data={doctors.documents} />
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
