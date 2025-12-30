"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@/components/ui/form";
import { createUser } from "@/lib/actions/patient.actions";
import { UserFormValidation } from "@/lib/validation";

import "react-phone-number-input/style.css";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { IconLock, IconShieldLock } from "@tabler/icons-react";
import { ForgotPasswordModal } from "../ForgotPasswordModal";

export const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const form = useForm<z.infer<typeof UserFormValidation>>({
    resolver: zodResolver(UserFormValidation),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof UserFormValidation>) => {
    setIsLoading(true);

    try {
      const user = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      };

      const newUser = await createUser(user);

      if (newUser) {
        // After creating/finding user, sign them in with NextAuth
        const { signIn } = await import("next-auth/react");
        const result = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        if (result?.error) {
          console.error("Login failed:", result.error);
          alert("Login failed. Please check your credentials.");
          setIsLoading(false);
          return;
        }

        // After successful login, redirect based on patient status
        if (newUser.patient) {
          router.push(`/patients/${newUser.id}/console`);
        } else {
          router.push(`/patients/${newUser.id}/register`);
        }
      }
    } catch (error) {
      console.log(error);
      alert("An error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="mb-12 space-y-4">
          <h1 className="header">Hi there 👋</h1>
          <p className="text-dark-700">Get started with appointments.</p>
        </section>

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Full name"
          placeholder="John Doe"
          iconSrc="/assets/icons/user.svg"
          iconAlt="user"
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="email"
          label="Email"
          placeholder="johndoe@gmail.com"
          iconSrc="/assets/icons/email.svg"
          iconAlt="email"
        />

        <CustomFormField
          fieldType={FormFieldType.PHONE_INPUT}
          control={form.control}
          name="phone"
          label="Phone number"
          placeholder="(555) 123-4567"
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter your password"
          iconSrc="/assets/icons/lock.svg"
          iconAlt="password"
          iconComponent={<IconLock className="size-5 text-dark-600" />}
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          iconSrc="/assets/icons/lock.svg"
          iconAlt="confirm password"
          iconComponent={<IconShieldLock className="size-5 text-dark-600" />}
        />

        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-green-500 hover:text-green-400 transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        <SubmitButton isLoading={isLoading}>Get Started</SubmitButton>
      </form>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </Form>
  );
};
