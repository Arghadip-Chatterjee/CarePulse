import { DoctorUserForm } from "@/components/forms/DoctorUser";
import React from "react";

const DoctorPage = () => {
  return (
    <div className="flex h-screen max-h-screen w-full max-w-screen-md justify-center items-center m-auto">
      <DoctorUserForm />
    </div>
  );
};

export default DoctorPage;
