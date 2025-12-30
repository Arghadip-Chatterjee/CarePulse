"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "./CustomFormField";

const ForgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ForgotPasswordModal = ({ isOpen, onClose }: ForgotPasswordModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof ForgotPasswordSchema>) => {
        setIsLoading(true);
        setMessage(null);

        const result = await requestPasswordReset(values.email);

        if (result.success) {
            setMessage({ type: "success", text: result.message });
            form.reset();
        } else {
            setMessage({ type: "error", text: result.message });
        }

        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-lg bg-dark-300 p-6 shadow-xl border border-dark-500">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-dark-600 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
                <p className="text-dark-700 mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <CustomFormField
                            fieldType={FormFieldType.INPUT}
                            control={form.control}
                            name="email"
                            label="Email"
                            placeholder="johndoe@gmail.com"
                            iconSrc="/assets/icons/email.svg"
                            iconAlt="email"
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

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-green-500 hover:bg-green-600"
                                disabled={isLoading}
                            >
                                {isLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
};
