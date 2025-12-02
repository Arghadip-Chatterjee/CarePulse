import Image from "next/image";
import { redirect } from "next/navigation";

import RegisterForm from "@/components/forms/RegisterForm";
import { getPatient, getUser } from "@/lib/actions/patient.actions";

const Register = async ({ params: { userId } }: SearchParamProps) => {
  const user = await getUser(userId);
  const patient = await getPatient(userId);

  // if (!patient) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-3xl font-bold text-red-500 mb-4">
  //           Unauthorized Access
  //         </h1>
  //         <p className="text-lg mb-6">
  //           The Patient ID is invalid or not found in our database.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  if (patient) redirect(`/patients/${userId}/new-appointment`);

  return (
    <div className="min-h-screen w-full bg-black-900">
      <div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Image
              src="/assets/icons/logo-full.svg"
              height={1000}
              width={1000}
              alt="logo"
              className="mb-8 h-10 w-fit"
            />
          </div>

          {/* Form Section */}
          <div className="rounded-lg bg-black-800 p-6 shadow-lg md:p-8 lg:p-10">
            <RegisterForm user={user} userId={userId} />
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

export default Register;
