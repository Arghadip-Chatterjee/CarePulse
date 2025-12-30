import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import { FileUploadDemo } from "@/components/Fileupload";
import { prescriptionColumns } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";

import { getPatient } from "@/lib/actions/patient.actions";
import { getPrescriptionListByUserId } from "@/lib/actions/prescription.action";
import { auth } from "@/lib/auth.config";
import { redirect } from "next/navigation";

const PrescriptionConsole = async ({
  params: { userId },
}: SearchParamProps) => {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    redirect("/home");
  }

  // Verify the userId matches the authenticated user
  if (session.user.id !== userId) {
    redirect(`/patients/${session.user.id}/prescription`);
  }

  const patient = await getPatient(userId);
  console.log(patient);

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
          <Link href={`/patients/${userId}/console`}>
            <Button className="">Patient Console</Button>
          </Link>
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
          data={prescriptions || []}
        />
      </main>
    </div>
  );
};

export default PrescriptionConsole;
