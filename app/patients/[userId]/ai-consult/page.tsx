"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AIConsultChat } from "@/components/AIConsultChat";
import { VoiceConsultation } from "@/components/VoiceConsultation";
import {
    createAIConsultation,
    analyzePrescriptions,
    sendMessageToAI,
    completeConsultation,
    saveVoiceConsultationSummary,
} from "@/lib/actions/ai.actions";
import { getPrescriptionsByUserId } from "@/lib/actions/prescription.prisma.actions";

// Prescription type matching Prisma schema (snake_case fields)
interface Prescription {
    id: string;
    prescription_url: string;
    fileId: string;
    user_id: string;
    uploaded_at: Date;
    appointmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface AIConsultPageProps {
    params: { userId: string };
}

export default function AIConsultPage({ params: { userId } }: AIConsultPageProps) {
    const router = useRouter();
    const [step, setStep] = useState<"select" | "mode" | "chat" | "voice" | "complete">("select");
    const [consultationMode, setConsultationMode] = useState<"text" | "voice">("text");
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [selectedPrescriptions, setSelectedPrescriptions] = useState<string[]>([]);
    const [consultationId, setConsultationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [initialMessages, setInitialMessages] = useState<any[]>([]);
    const [consultationSummary, setConsultationSummary] = useState<string | null>(null);

    useEffect(() => {
        loadPrescriptions();
    }, [userId]);

    const loadPrescriptions = async () => {
        const result = await getPrescriptionsByUserId(userId);
        if (result.documents) {
            setPrescriptions(result.documents);
        }
    };

    const togglePrescription = (url: string) => {
        setSelectedPrescriptions((prev) =>
            prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
        );
    };

    const handleModeSelection = () => {
        if (selectedPrescriptions.length === 0) {
            alert("Please select at least one prescription");
            return;
        }
        setStep("mode");
    };

    const handleStartConsultation = async (mode: "text" | "voice") => {
        setConsultationMode(mode);
        setIsLoading(true);

        const createResult = await createAIConsultation(userId, userId, selectedPrescriptions, mode);

        if (!createResult.success || !createResult.consultationId) {
            alert("Failed to start consultation");
            setIsLoading(false);
            return;
        }

        setConsultationId(createResult.consultationId);

        if (mode === "text") {
            const analyzeResult = await analyzePrescriptions(
                createResult.consultationId,
                selectedPrescriptions
            );

            if (analyzeResult.success && analyzeResult.message) {
                setInitialMessages([{ role: "assistant", content: analyzeResult.message }]);
                setStep("chat");
            } else {
                alert("Failed to analyze prescriptions");
            }
        } else {
            setStep("voice");
        }

        setIsLoading(false);
    };

    const handleVoiceComplete = async (summary: string) => {
        if (!consultationId) return;

        setConsultationSummary(summary);
        setIsLoading(true);

        const result = await saveVoiceConsultationSummary(consultationId, summary);

        if (result.success) {
            setStep("complete");
        } else {
            alert("Failed to save consultation summary");
        }

        setIsLoading(false);
    };

    const handleSendMessage = async (message: string) => {
        if (!consultationId) return { success: false, error: "No consultation ID" };
        return await sendMessageToAI(consultationId, message);
    };

    const handleCompleteConsultation = async () => {
        if (!consultationId) return;

        setIsLoading(true);
        const result = await completeConsultation(consultationId);

        if (result.success) {
            setStep("complete");
        } else {
            alert("Failed to complete consultation");
        }

        setIsLoading(false);
    };

    return (
        <div className="mx-auto flex max-w-7xl flex-col space-y-8 min-h-screen">
            <header className="admin-header">
                <Link href="/" className="cursor-pointer">
                    <Image
                        src="/assets/icons/logo-full.svg"
                        height={32}
                        width={162}
                        alt="logo"
                        className="h-8 w-fit"
                    />
                </Link>

                <div className="flex items-center gap-4">
                    <Link href={`/patients/${userId}/console`}>
                        <Button variant="outline" className="border-dark-500">
                            Back to Console
                        </Button>
                    </Link>
                    <p className="text-16-semibold">AI Doctor Consultation</p>
                </div>
            </header>

            <main className="admin-main pb-12">
                {/* Step 1: Select Prescriptions */}
                {step === "select" && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="header">Select Your Prescriptions</h1>
                            <p className="text-dark-700 mt-2">
                                Choose the prescriptions you want the AI doctor to analyze
                            </p>
                        </div>

                        {prescriptions.length === 0 ? (
                            <div className="bg-dark-300 border border-dark-500 rounded-lg p-8 text-center">
                                <p className="text-white mb-4">You haven't uploaded any prescriptions yet</p>
                                <Link href={`/patients/${userId}/prescription`}>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        Upload Prescription
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {prescriptions.map((prescription) => (
                                        <div
                                            key={prescription.id}
                                            onClick={() => togglePrescription(prescription.prescription_url)}
                                            className={`cursor-pointer bg-dark-300 border-2 rounded-lg p-4 transition-all ${selectedPrescriptions.includes(prescription.prescription_url)
                                                ? "border-green-500 bg-green-500/10"
                                                : "border-dark-500 hover:border-dark-400"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm text-dark-700">
                                                    {new Date(prescription.uploaded_at).toLocaleDateString()}
                                                </span>
                                                {selectedPrescriptions.includes(prescription.prescription_url) && (
                                                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <img
                                                src={prescription.prescription_url}
                                                alt="Prescription"
                                                className="w-full h-48 object-cover rounded"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleModeSelection}
                                        disabled={selectedPrescriptions.length === 0 || isLoading}
                                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                                    >
                                        Continue ({selectedPrescriptions.length} selected)
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 2: Choose Consultation Mode */}
                {step === "mode" && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="header">Choose Consultation Mode</h1>
                            <p className="text-dark-700 mt-2">
                                Select how you'd like to consult with the AI doctor
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            {/* Text Chat Option */}
                            <div
                                onClick={() => handleStartConsultation("text")}
                                className="cursor-pointer bg-dark-300 border-2 border-dark-500 hover:border-blue-500 rounded-lg p-8 transition-all hover:bg-dark-400"
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <h3 className="text-xl font-bold text-white">Text Chat</h3>
                                    <p className="text-dark-700 text-sm">
                                        Type your messages and get detailed written responses from the AI doctor
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-dark-700">
                                        <span>✓ Detailed responses</span>
                                        <span>✓ Easy to review</span>
                                    </div>
                                </div>
                            </div>

                            {/* Voice Call Option */}
                            <div
                                onClick={() => handleStartConsultation("voice")}
                                className="cursor-pointer bg-dark-300 border-2 border-dark-500 hover:border-green-500 rounded-lg p-8 transition-all hover:bg-dark-400"
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    <h3 className="text-xl font-bold text-white">Voice Call</h3>
                                    <p className="text-dark-700 text-sm">
                                        Speak naturally with the AI doctor in a real-time voice conversation
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-dark-700">
                                        <span>✓ Natural conversation</span>
                                        <span>✓ Hands-free</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <Button
                                onClick={() => setStep("select")}
                                variant="outline"
                                className="border-dark-500"
                            >
                                ← Back to Selection
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3a: Text Chat */}
                {step === "chat" && consultationId && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="header">AI Doctor Consultation</h1>
                                <p className="text-dark-700 mt-2">
                                    Answer the AI's questions about your prescriptions and symptoms
                                </p>
                            </div>
                            <Button
                                onClick={handleCompleteConsultation}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isLoading ? "Completing..." : "Complete Consultation"}
                            </Button>
                        </div>

                        <div className="h-[600px]">
                            <AIConsultChat
                                consultationId={consultationId}
                                initialMessages={initialMessages}
                                onSendMessage={handleSendMessage}
                            />
                        </div>
                    </div>
                )}

                {/* Step 3b: Voice Consultation */}
                {step === "voice" && consultationId && (
                    <VoiceConsultation
                        consultationId={consultationId}
                        prescriptionUrls={selectedPrescriptions}
                        onComplete={handleVoiceComplete}
                    />
                )}

                {/* Step 4: Completion */}
                {step === "complete" && (
                    <div className="space-y-6">
                        <div className="bg-dark-300 border border-dark-500 rounded-lg p-8 text-center">
                            <div className="flex justify-center mb-4">
                                <svg className="w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Consultation Completed!</h2>
                            <p className="text-dark-700 mb-2">
                                Your {consultationMode === "voice" ? "voice" : "text"} consultation has been saved.
                            </p>
                            <p className="text-sm text-dark-600 mb-6">
                                Consultation ID: {consultationId}
                            </p>

                            {consultationSummary && consultationMode === "voice" && (
                                <div className="bg-dark-400 border border-dark-500 rounded-lg p-6 mb-6 text-left">
                                    <h3 className="text-lg font-semibold text-white mb-3">Consultation Summary</h3>
                                    <p className="text-dark-700 whitespace-pre-wrap">{consultationSummary}</p>
                                </div>
                            )}

                            <div className="flex gap-4 justify-center">
                                <Link href={`/patients/${userId}/console`}>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        Back to Console
                                    </Button>
                                </Link>
                                <Button
                                    onClick={() => {
                                        setStep("select");
                                        setSelectedPrescriptions([]);
                                        setConsultationId(null);
                                        setInitialMessages([]);
                                        setConsultationSummary(null);
                                    }}
                                    variant="outline"
                                    className="border-dark-500"
                                >
                                    Start New Consultation
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
