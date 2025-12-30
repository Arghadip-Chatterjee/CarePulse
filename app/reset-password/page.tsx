"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { resetPassword, verifyResetToken } from "@/lib/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "@/components/CustomFormField";
import { IconLock, IconShieldLock } from "@tabler/icons-react";

const ResetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const form = useForm<z.infer<typeof ResetPasswordSchema>>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setIsValidToken(false);
                setIsVerifying(false);
                return;
            }

            const result = await verifyResetToken(token);
            setIsValidToken(result.valid);
            setIsVerifying(false);

            if (!result.valid) {
                setMessage({ type: "error", text: result.message || "Invalid token" });
            }
        };

        verifyToken();
    }, [token]);

    const onSubmit = async (values: z.infer<typeof ResetPasswordSchema>) => {
        if (!token) return;

        setIsLoading(true);
        setMessage(null);

        const result = await resetPassword(token, values.password);

        if (result.success) {
            setMessage({ type: "success", text: result.message || "Password reset successfully!" });
            form.reset();

            // Redirect to home after 2 seconds
            setTimeout(() => {
                router.push("/home");
            }, 2000);
        } else {
            setMessage({ type: "error", text: result.message || "Failed to reset password. Please try again." });
        }

        setIsLoading(false);
    };

    if (isVerifying) {
        return (
            <div className="min-h-screen w-full bg-black-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-dark-700">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className="min-h-screen w-full bg-black-900 flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="rounded-lg bg-black-800 p-8 text-center border border-dark-500">
                        <div className="mb-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                <X className="h-8 w-8 text-red-500" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h1>
                        <p className="text-dark-700 mb-6">{message?.text || "This password reset link is invalid or has expired."}</p>
                        <Link href="/home">
                            <Button className="bg-green-500 hover:bg-green-600">
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-black-900">
            <div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
                <div className="mx-auto max-w-md">
                    <div className="mb-8">
                        <Image
                            src="/assets/icons/logo-full.svg"
                            height={1000}
                            width={1000}
                            alt="logo"
                            className="mb-8 h-10 w-fit"
                        />
                    </div>

                    <div className="rounded-lg bg-black-800 p-6 shadow-lg md:p-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
                        <p className="text-dark-700 mb-6">Enter your new password below.</p>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <CustomFormField
                                    fieldType={FormFieldType.INPUT}
                                    control={form.control}
                                    name="password"
                                    label="New Password"
                                    placeholder="Enter new password"
                                    iconComponent={<IconLock className="size-5 text-dark-600" />}
                                />

                                <CustomFormField
                                    fieldType={FormFieldType.INPUT}
                                    control={form.control}
                                    name="confirmPassword"
                                    label="Confirm Password"
                                    placeholder="Confirm new password"
                                    iconComponent={<IconShieldLock className="size-5 text-dark-600" />}
                                />

                                {message && (
                                    <div
                                        className={`p-3 rounded-md text-sm ${message.type === "success"
                                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                            : "bg-red-500/10 text-red-500 border border-red-500/20"
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-green-500 hover:bg-green-600"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Resetting..." : "Reset Password"}
                                </Button>
                            </form>
                        </Form>
                    </div>

                    <p className="mt-8 text-center text-sm text-dark-500">
                        © 2024 CarePulse. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
