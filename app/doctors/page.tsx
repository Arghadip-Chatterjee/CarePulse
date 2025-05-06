import React from "react";

import { DoctorUserForm } from "@/components/forms/DoctorUser";

const DoctorPage = () => {
  return (
    <div className="flex h-screen max-h-screen w-full max-w-screen-md justify-center items-center m-auto">
      <DoctorUserForm />
    </div>
  );
};

export default DoctorPage;
