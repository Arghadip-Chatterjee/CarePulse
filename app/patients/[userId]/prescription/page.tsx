import Image from "next/image";
import { getPatient } from "@/lib/actions/patient.actions";
import Link from "next/link";
import { FileUploadDemo } from "@/components/Fileupload";
import { revalidatePath } from "next/cache";
import { prescriptionColumns } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { getPrescriptionListByUserId } from "@/lib/actions/prescription.action";

const PrescriptionConsole = async ({
  params: { userId },
}: SearchParamProps) => {
  const patient = await getPatient(userId);
  console.log(patient);

  const prescriptions = await getPrescriptionListByUserId(userId);

  revalidatePath(`/patients/${userId}/prescription`, "page"); // Ensure UI updates

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
          <p className="text-16-semibold">Prescription Dashboard</p>
        </div>
      </header>
      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome {patient.name} </h1>
          <p className="text-dark-700">
            Start the day with managing Prescriptions
          </p>
        </section>
        <FileUploadDemo userId={userId} />
        <DataTable
          columns={prescriptionColumns}
          data={prescriptions.documents}
        />
        {/* Placeholder for DataTable */}
      </main>
    </div>
  );
};

export default PrescriptionConsole;
