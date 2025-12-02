import Image from "next/image";
import Link from "next/link";

import { PatientForm } from "@/components/forms/PatientForm";
import { PasskeyModal } from "@/components/PasskeyModal";
// import { Toaster } from 'react-hot-toast';


const Home = ({ searchParams }: SearchParamProps) => {
  const isAdmin = searchParams?.admin === "true";

  return (
    <div className="min-h-screen w-full bg-black-900">
      {isAdmin && <PasskeyModal />}

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
          <PatientForm />
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-dark-500">
            <p>© 2024 CarePulse. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/doctors" className="text-green-500 hover:text-green-400 transition-colors">
              Doctor
            </Link>
              <Link href="/admin?admin=true" className="text-green-500 hover:text-green-400 transition-colors">
              Admin
            </Link>
            </div>
          </div>
        </div>
      </div>
   </div>
  );
};

export default Home;
