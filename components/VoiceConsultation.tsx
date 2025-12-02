"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { saveVoiceConsultationSummary } from "@/lib/actions/ai.actions";

interface VoiceConsultationProps {
    consultationId: string;
    prescriptionUrls: string[];
    onComplete: (summary: string) => void;
}

export const VoiceConsultation = ({
    consultationId,
    prescriptionUrls,
    onComplete,
}: VoiceConsultationProps) => {
    const [status, setStatus] = useState<"idle" | "analyzing" | "analyzed" | "requesting" | "connecting" | "connected" | "ended" | "generating-summary">("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [isWaitingForSummary, setIsWaitingForSummary] = useState(false);
    const [prescriptionAnalysis, setPrescriptionAnalysis] = useState<string>("");
    const [transcripts, setTranscripts] = useState<string[]>([]);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const summaryRef = useRef<string | null>(null);
    const transcriptsRef = useRef<string[]>([]);
    const isSessionActiveRef = useRef<boolean>(false);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        isSessionActiveRef.current = false;
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (dcRef.current) {
            dcRef.current.close();
            dcRef.current = null;
        }
        if (audioElementRef.current) {
            audioElementRef.current.srcObject = null;
            audioElementRef.current = null;
        }
    };

    const analyzePrescriptions = async () => {
        try {
            setStatus("analyzing");
            setError(null);

            if (prescriptionUrls.length > 0) {
                const analysisResponse = await fetch("/api/realtime/analyze-prescriptions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ prescriptionUrls }),
                });

                if (analysisResponse.ok) {
                    const { analysis } = await analysisResponse.json();
                    setPrescriptionAnalysis(analysis);
                    console.log("Prescription analysis complete:", analysis);
                    setStatus("analyzed");
                } else {
                    throw new Error("Failed to analyze prescriptions");
                }
            } else {
                // No prescriptions to analyze
                setStatus("analyzed");
            }
        } catch (err: any) {
            console.error("Error analyzing prescriptions:", err);
            setError(err.message || "Failed to analyze prescriptions");
            setStatus("idle");
        }
    };

    const startConsultation = async () => {
        // Prevent multiple sessions
        if (isSessionActiveRef.current) {
            console.warn("Session already active, ignoring start request");
            return;
        }

        try {
            setStatus("requesting");
            setError(null);

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;

            setStatus("connecting");

            // Create peer connection - ONE session only
            const pc = new RTCPeerConnection();
            pcRef.current = pc;
            isSessionActiveRef.current = true;

            // Set up to play remote audio from the AI
            const audioElement = document.createElement("audio");
            audioElement.autoplay = true;
            audioElementRef.current = audioElement;

            pc.ontrack = (e) => {
                if (audioElementRef.current) {
                    audioElementRef.current.srcObject = e.streams[0];
                }
            };

            // Add local audio track for microphone input
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            // Set up data channel for events
            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            dc.onopen = () => {
                console.log("Data channel opened - session active");
                setStatus("connected");

                // DO NOTHING - let the session flow naturally
                // The AI will start speaking based on session instructions
                // NO events sent here - conversation happens automatically

                // Start duration timer (1 second intervals)
                durationIntervalRef.current = setInterval(() => {
                    setDuration((prev) => {
                        const newDuration = prev + 1;
                        // Auto-end after 5 minutes (300 seconds)
                        if (newDuration >= 300) {
                            endConsultation();
                        }
                        return newDuration;
                    });
                }, 1000);
            };

            dc.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);

                    // Log output transcript events
                    if (event.type === "response.output_audio_transcript.done" ||
                        event.type === "response.audio_transcript.done") {
                        console.log("AI Transcript:", event.transcript);
                        if (event.transcript) {
                            setTranscripts((prev) => {
                                const newTranscripts = [...prev, event.transcript];
                                transcriptsRef.current = newTranscripts;
                                return newTranscripts;
                            });

                            // If waiting for summary, also set summary
                            if (isWaitingForSummary) {
                                console.log("Summary transcript received");
                                setSummary(event.transcript);
                                summaryRef.current = event.transcript;
                                setIsWaitingForSummary(false);
                            }
                        }
                    }

                    // Handle text content (backup)
                    if (event.type === "response.content_part.done" && event.part?.type === "text") {
                        if (event.part.text) {
                            setTranscripts((prev) => {
                                const newTranscripts = [...prev, event.part.text];
                                transcriptsRef.current = newTranscripts;
                                return newTranscripts;
                            });

                            if (isWaitingForSummary) {
                                console.log("Summary text received");
                                setSummary(event.part.text);
                                summaryRef.current = event.part.text;
                                setIsWaitingForSummary(false);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error parsing data channel message:", err);
                }
            };

            dc.onerror = (e) => {
                console.error("Data channel error:", e);
                setError("Communication error occurred");
            };

            pc.onconnectionstatechange = () => {
                console.log("Connection state:", pc.connectionState);
                if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                    console.error("Peer connection lost");
                    if (isSessionActiveRef.current) {
                        setError("Connection lost. Please try again.");
                        cleanup();
                        setStatus("idle");
                    }
                }
            };

            // Create and set local description
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send SDP to our backend with prescription analysis
            const sdpResponse = await fetch(
                `/api/realtime/session?prescriptionAnalysis=${encodeURIComponent(prescriptionAnalysis)}`,
                {
                    method: "POST",
                    body: offer.sdp,
                    headers: {
                        "Content-Type": "application/sdp",
                    },
                }
            );

            if (!sdpResponse.ok) {
                throw new Error("Failed to create session");
            }

            const answerSdp = await sdpResponse.text();
            const answer: RTCSessionDescriptionInit = {
                type: "answer",
                sdp: answerSdp,
            };

            await pc.setRemoteDescription(answer);
        } catch (err: any) {
            console.error("Error starting consultation:", err);
            setError(err.message || "Failed to start consultation");
            setStatus("idle");
            cleanup();
        }
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const requestSummary = () => {
        if (dcRef.current && dcRef.current.readyState === "open") {
            setIsWaitingForSummary(true);

            // Simply ask the AI for a summary using conversation.item.create
            const summaryRequest = {
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `Please provide a comprehensive summary of our entire consultation. Include: 1) All medications discussed${prescriptionAnalysis ? " from the prescriptions and any others mentioned" : ""}, 2) Symptoms I reported, 3) Health concerns identified, 4) Recommendations you gave, 5) Suggested next steps. Be thorough but concise.`
                        }
                    ]
                }
            };

            dcRef.current.send(JSON.stringify(summaryRequest));

            // Trigger response
            const responseCreate = {
                type: "response.create"
            };
            dcRef.current.send(JSON.stringify(responseCreate));

            console.log("Summary request sent - waiting for AI response");
        }
    };

    const endConsultation = async () => {
        // Stop the microphone but KEEP the session/data channel open for summary
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }

        setStatus("generating-summary");

        // Request summary
            requestSummary();

        // Wait for summary with timeout
        const checkSummary = setInterval(async () => {
            if (summaryRef.current) {
                clearInterval(checkSummary);
                finishConsultation(summaryRef.current);
            }
        }, 500);

        // Timeout after 20 seconds
        setTimeout(async () => {
            clearInterval(checkSummary);

            // If we have a summary (or if we can fallback to last transcript)
            const currentTranscripts = transcriptsRef.current;
            const finalSummary = summaryRef.current ||
                (currentTranscripts.length > 0 ? currentTranscripts[currentTranscripts.length - 1] : "No conversation recorded.");

            finishConsultation(finalSummary);
        }, 20000);
    };

    const finishConsultation = async (finalSummary: string) => {
        // Save summary and transcripts to database and localStorage
        console.log("Saving consultation data...");

        // Save to localStorage
        localStorage.setItem(`consultation_summary_${consultationId}`, finalSummary);

        // Save to DB - use the ref to ensure we have latest transcripts
        const result = await saveVoiceConsultationSummary(
            consultationId,
            finalSummary,
            transcriptsRef.current
        );

        if (result.success) {
            console.log("Consultation data saved successfully");
                } else {
            console.error("Failed to save consultation data:", result.error);
                }

        // Cleanup and complete
            cleanup();
        onComplete(finalSummary);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    if (status === "idle") {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <svg className="w-20 h-20 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Voice Consultation</h2>
                    <p className="text-dark-700 max-w-md">
                        {prescriptionUrls.length > 0
                            ? `First, we'll analyze your ${prescriptionUrls.length} prescription${prescriptionUrls.length > 1 ? 's' : ''}, then start the voice consultation.`
                            : "Click below to start a voice consultation with the AI doctor. Make sure your microphone is working."
                        }
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 max-w-md">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                )}

                <Button
                    onClick={prescriptionUrls.length > 0 ? analyzePrescriptions : startConsultation}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                >
                    {prescriptionUrls.length > 0 ? "📋 Analyze Prescriptions" : "🎤 Start Voice Consultation"}
                </Button>

                <div className="bg-dark-400 border border-dark-500 rounded-lg p-4 max-w-md">
                    <p className="text-sm text-dark-700">
                        💡 <strong>Tip:</strong> Speak clearly about your symptoms, medications, and health concerns. The AI will ask follow-up questions.
                    </p>
                </div>
            </div>
        );
    }

    if (status === "analyzing") {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p className="text-white text-lg">Analyzing prescriptions...</p>
                <p className="text-dark-700 text-sm">Using AI to read and understand your prescriptions</p>
            </div>
        );
    }

    if (status === "analyzed") {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <svg className="w-20 h-20 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Prescriptions Analyzed!</h2>
                    <p className="text-dark-700 max-w-md">
                        Your prescriptions have been analyzed. The AI doctor now has context about your medications.
                    </p>
                </div>

                {prescriptionAnalysis && (
                    <div className="bg-dark-400 border border-dark-500 rounded-lg p-4 max-w-2xl">
                        <h3 className="text-white font-semibold mb-2">📋 Analysis Summary:</h3>
                        <p className="text-dark-700 text-sm whitespace-pre-wrap">{prescriptionAnalysis}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 max-w-md">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                )}

                <Button
                    onClick={startConsultation}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                >
                    🎤 Continue to Voice Consultation
                </Button>

                <div className="bg-dark-400 border border-dark-500 rounded-lg p-4 max-w-md">
                    <p className="text-sm text-dark-700 text-center">
                        💡 The AI doctor will discuss these medications with you during the consultation.
                    </p>
                </div>
            </div>
        );
    }

    if (status === "requesting" || status === "connecting") {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
                <p className="text-white text-lg">
                    {status === "requesting" ? "Requesting microphone access..." : "Connecting to AI doctor..."}
                </p>
                {status === "connecting" && prescriptionAnalysis && (
                    <p className="text-dark-700 text-sm max-w-md text-center">
                        Preparing consultation with prescription context...
                    </p>
                )}
            </div>
        );
    }

    if (status === "generating-summary") {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p className="text-white text-lg">Generating consultation summary...</p>
                <p className="text-dark-700 text-sm">This may take a few moments</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    Voice Consultation Active
                </h2>
                <p className="text-dark-700 mt-2">
                    Duration: {formatDuration(duration)} / 5:00
                </p>
                {duration >= 240 && duration < 300 && (
                    <p className="text-yellow-500 text-sm mt-1">
                        ⏱️ Less than 1 minute remaining
                    </p>
                )}
            </div>

            {/* Audio Visualizer */}
            <AudioVisualizer stream={localStreamRef.current} isActive={status === "connected"} />

            {/* Status */}
            <div className="text-center">
                <p className="text-white">
                    {isMuted ? "🔇 Microphone Muted" : "🎤 Listening..."}
                </p>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
                <Button
                    onClick={toggleMute}
                    variant="outline"
                    className={`border-dark-500 ${isMuted ? "bg-red-500/20 border-red-500" : ""}`}
                >
                    {isMuted ? "🔇 Unmute" : "🔊 Mute"}
                </Button>

                <Button
                    onClick={endConsultation}
                    className="bg-red-600 hover:bg-red-700 text-white"
                >
                    📞 End Consultation
                </Button>
            </div>

            {/* Tips */}
            <div className="bg-dark-400 border border-dark-500 rounded-lg p-4">
                <p className="text-sm text-dark-700 text-center">
                    💡 Speak naturally and clearly. The AI will ask questions and provide guidance.
                </p>
            </div>

            {/* Live Transcript */}
            {transcripts.length > 0 && (
                <div className="bg-dark-400 border border-dark-500 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h3 className="text-white font-semibold mb-2 text-sm">Live Transcript:</h3>
                    <div className="space-y-2">
                        {[...transcripts].reverse().map((text, i) => (
                            <p key={i} className="text-dark-700 text-sm bg-dark-300 p-2 rounded">
                                <span className="text-green-500 font-bold">AI:</span> {text}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                    <p className="text-red-500 text-sm">{error}</p>
                </div>
            )}
        </div>
    );
};
