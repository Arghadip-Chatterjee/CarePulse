import Image from "next/image";
import { redirect } from "next/navigation";

// import RegisterForm from "@/components/forms/RegisterForm";
import { DoctorForm } from "@/components/forms/DoctorForm";
import { getDoctor } from "@/lib/actions/doctor.actions";

import { getUser } from "@/lib/actions/patient.actions";

const DoctorRegister = async ({ params: { userId } }: SearchParamProps) => {
  const user = await getUser(userId);
  const patient = await getDoctor(userId);

  // if (!patient) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-3xl font-bold text-red-500 mb-4">
  //           Unauthorized Access
  //         </h1>
  //         <p className="text-lg mb-6">
  //           The doctor ID is invalid or not found in our database.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  if (patient) redirect(`/doctors/${userId}/console`);

  return (
    <div className="flex h-screen max-h-screen">
      <section className="remove-scrollbar container">
        <div className="sub-container max-w-[860px] flex-1 flex-col py-10">
          <Image
            src="/assets/icons/logo-full.svg"
            height={1000}
            width={1000}
            alt="patient"
            className="mb-12 h-10 w-fit"
          />

          <DoctorForm user={user} />

          <p className="copyright py-12">© 2024 CarePluse</p>
        </div>
      </section>

      <Image
        src="/assets/images/register-img.png"
        height={1000}
        width={1000}
        alt="patient"
        className="side-img max-w-[390px]"
      />
    </div>
  );
};

export default DoctorRegister;
