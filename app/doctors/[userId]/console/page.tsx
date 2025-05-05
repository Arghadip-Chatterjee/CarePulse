import Image from "next/image";
import { getDoctor } from "@/lib/actions/doctor.actions";
import { StatCard } from "@/components/StatCard";
import { columns1 } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { getAppointmentbyDoctorId } from "@/lib/actions/appointment.actions";
import { getPrescriptionListByUserId } from "@/lib/actions/prescription.action";
import Link from "next/link";
import PrescriptionForm from "@/components/PrescriptionForm";
import { revalidatePath } from "next/cache";

const DoctorConsole = async ({ params: { userId } }: SearchParamProps) => {
  const doctor = await getDoctor(userId);
  const appointments = await getAppointmentbyDoctorId(userId);
  revalidatePath(`/doctors/${userId}/console`);

  if (!doctor) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">
            Unauthorized Access
          </h1>
          <p className="text-lg mb-6">
            The doctor ID is invalid or not found in our database.
          </p>
        </div>
      </div>
    );
  }

  // Fetch prescriptions for each appointment
  const prescriptionsList = await Promise.all(
    appointments.documents.map(async (appointment: any) => {
      const prescriptions = await getPrescriptionListByUserId(
        appointment.userId
      );
      return {
        appointmentId: appointment.$id,
        prescriptions: prescriptions.documents,
        appointmentName: appointment.patient.name,
      };
    })
  );

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
          <p className="text-16-semibold">Doctor Dashboard</p>
        </div>
      </header>

      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome {doctor?.name} </h1>
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

        <DataTable columns={columns1} data={appointments.documents} />

        {/* Inside DoctorConsole component */}
        <PrescriptionForm
          userId={userId}
          appointments={appointments.documents}
        />

        {/* Prescription List for each appointment in table format */}
        <section className="w-full space-y-4">
          <h1 className="header">Prescription List</h1>
          <table className="min-w-full border text-white border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b border border-white">
                  Appointment ID
                </th>
                <th className="py-2 px-4 border-b border border-white">
                  Patient Name
                </th>
                <th className="py-2 px-4 border-b border border-white">
                  Prescriptions
                </th>
              </tr>
            </thead>
            <tbody>
              {prescriptionsList.map(
                ({ appointmentId, appointmentName, prescriptions }) => (
                  <tr key={appointmentId}>
                    <td className="py-2 px-4 border-b border border-white">
                      {appointmentId}
                    </td>
                    <td className="py-2 px-4 border-b border border-white">
                      {appointmentName}
                    </td>
                    <td className="py-2 px-4 border-b border border-white">
                      {prescriptions.map((prescription: any, index: number) => (
                        <div key={prescription.fileId}>
                          <Link
                            href={prescription.prescription_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            Prescription {index + 1}
                          </Link>
                        </div>
                      ))}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default DoctorConsole;
