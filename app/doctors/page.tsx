import React from "react";

import { DoctorUserForm } from "@/components/forms/DoctorUser";

const DoctorPage = () => {
  return (
    <div className="flex min-h-screen w-full justify-center items-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md">
        <DoctorUserForm />
      </div>
    </div>
  );
};

export default DoctorPage;
