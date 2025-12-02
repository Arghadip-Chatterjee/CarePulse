"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form,FormControl } from "@/components/ui/form";
import { SelectItem } from "@/components/ui/select";

import { registerDoctor, updateDoctor } from "@/lib/actions/doctor.actions";
import { DoctorFormValidation } from "@/lib/validation";

import { Specialization } from "@/types/appwrite.types";

import AvailableTimingsField from "../AvailableTimings";
import CustomFormField,{ FormFieldType } from "../CustomFormField";

import { FileUploader } from "../FileUploader";

import "react-phone-number-input/style.css";

import SubmitButton from "../SubmitButton";
import "react-datepicker/dist/react-datepicker.css";

export const DoctorForm = ({ 
  user, 
  doctor, 
  onSuccess 
}: { 
  user: User;
  doctor?: any;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!doctor;

  const form = useForm<z.infer<typeof DoctorFormValidation>>({
    resolver: zodResolver(DoctorFormValidation),
    defaultValues: {
      name: doctor?.name || "",
      email: doctor?.email || "",
      phone: doctor?.phone || "",
      specialization: doctor?.specialization || undefined,
      licenseNumber: doctor?.licenseNumber || "",
      yearsOfExperience: doctor?.yearsOfExperience || "0",
      hospitalAffiliation: doctor?.hospitalAffiliation || "",
      identificationType: doctor?.identificationType || undefined,
      identificationNumber: doctor?.identificationNumber || "",
      consultationFee: doctor?.consultationFee || "0",
      availableTimingsOnline: doctor?.availableTimingsOnline || [],
      availableTimingsOffline: doctor?.availableTimingsOffline || [],
      isVerified: doctor?.isVerified || false,
    },
  });
  const onSubmit = async (values: z.infer<typeof DoctorFormValidation>) => {
    console.log("Submit", values);
    setIsLoading(true);

    let formData: FormData | undefined;

    if (
      values.identificationDocument &&
      values.identificationDocument.length > 0
    ) {
      const file = values.identificationDocument[0];

      formData = new FormData();
      formData.append("blobFile", file);
      formData.append("fileName", file.name);
    }

    try {
      if (isEditMode && doctor?.id) {
        // Update existing doctor
        const updateData = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          specialization: values.specialization,
          licenseNumber: values.licenseNumber,
          yearsOfExperience: values.yearsOfExperience,
          hospitalAffiliation: values.hospitalAffiliation,
          identificationType: values.identificationType,
          identificationNumber: values.identificationNumber,
          consultationFee: values.consultationFee,
          availableTimingsOnline: values.availableTimingsOnline,
          availableTimingsOffline: values.availableTimingsOffline,
          isVerified: values.isVerified,
        };

        await updateDoctor(doctor.id, updateData);
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else {
        // Create new doctor
        const doctorData = {
          userId: user.$id,
          name: values.name,
          email: values.email,
          phone: values.phone,
          specialization: values.specialization,
          licenseNumber: values.licenseNumber,
          yearsOfExperience: values.yearsOfExperience,
          hospitalAffiliation: values.hospitalAffiliation,
          identificationType: values.identificationType,
          identificationNumber: values.identificationNumber,
          identificationDocument: formData ?? undefined,
          consultationFee: values.consultationFee,
          availableTimingsOnline: values.availableTimingsOnline,
          availableTimingsOffline: values.availableTimingsOffline,
          isVerified: values.isVerified,
        };

        const newDoctor = await registerDoctor(doctorData);

        if (newDoctor) {
          router.push(`/doctors/${user.$id}/console`);
        }
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'registering'} doctor:`, error);
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="mb-12 space-y-4">
          <h1 className="header">{isEditMode ? "Edit Doctor Details 🩺" : "Doctor Registration 🩺"}</h1>
          <p className="text-dark-700">
            {isEditMode ? "Update your doctor profile information." : "Join our medical network today."}
          </p>
        </section>

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Full Name"
          placeholder="Dr. John Doe"
          iconSrc="/assets/icons/user.svg"
          iconAlt="user"
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="email"
          label="Email"
          placeholder="doctor@example.com"
          iconSrc="/assets/icons/email.svg"
          iconAlt="email"
        />
        <CustomFormField
          fieldType={FormFieldType.PHONE_INPUT}
          control={form.control}
          name="phone"
          label="Phone Number"
          placeholder="(555) 123-4567"
        />
        <CustomFormField
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="specialization"
          label="Specialization"
          iconSrc="/assets/icons/medical.svg"
          iconAlt="medical"
        >
          {Object.values(Specialization).map((spec) => (
            <SelectItem key={spec} value={spec}>
              {spec}
            </SelectItem>
          ))}
        </CustomFormField>
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="licenseNumber"
          label="Medical License Number"
          placeholder="ABC123456"
          iconSrc="/assets/icons/license.svg"
          iconAlt="license"
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="yearsOfExperience"
          label="Years of Experience"
          placeholder="10"
          iconSrc="/assets/icons/experience.svg"
          iconAlt="experience"
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="hospitalAffiliation"
          label="Hospital Affiliation"
          placeholder="City Hospital"
          iconSrc="/assets/icons/hospital.svg"
          iconAlt="hospital"
        />

        <CustomFormField
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="identificationType"
          label="Identification Type"
          iconSrc="/assets/icons/id.svg"
          iconAlt="id"
        >
          <SelectItem value="Passport">Passport</SelectItem>
          <SelectItem value="Driver's License">Driver's License</SelectItem>
          <SelectItem value="National ID">National ID</SelectItem>
        </CustomFormField>

        <CustomFormField
          fieldType={FormFieldType.SKELETON}
          control={form.control}
          name="identificationDocument"
          label="Scanned Copy of Identification Document"
          renderSkeleton={(field) => (
            <FormControl>
              <FileUploader files={field.value} onChange={field.onChange} />
            </FormControl>
          )}
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="identificationNumber"
          label="Identification Number"
          placeholder="1234567890"
          iconSrc="/assets/icons/id-number.svg"
          iconAlt="id-number"
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="consultationFee"
          label="Consultation Fee ($)"
          placeholder="50"
          iconSrc="/assets/icons/money.svg"
          iconAlt="money"
        />

        <AvailableTimingsField
          control={form.control}
          name="availableTimingsOnline"
        />
        <AvailableTimingsField
          control={form.control}
          name="availableTimingsOffline"
        />

        <SubmitButton isLoading={isLoading}>Register as Doctor</SubmitButton>
      </form>
    </Form>
  );
};
