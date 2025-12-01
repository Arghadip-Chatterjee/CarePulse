"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AudioVisualizer } from "@/components/AudioVisualizer";

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
    const [status, setStatus] = useState<"idle" | "requesting" | "connecting" | "connected" | "ended">("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (pcRef.current) {
            pcRef.current.close();
        }
        if (audioElementRef.current) {
            audioElementRef.current.srcObject = null;
        }
    };

    const startConsultation = async () => {
        try {
            setStatus("requesting");
            setError(null);

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;

            setStatus("connecting");

            // Create peer connection
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

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
                console.log("Data channel opened");
                setStatus("connected");
                // Start duration timer
                durationIntervalRef.current = setInterval(() => {
                    setDuration((prev) => prev + 1);
                }, 1000);
            };

            dc.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);
                    console.log("Received event:", event);

                    // Handle conversation summary if AI provides it
                    if (event.type === "response.done" || event.type === "conversation.item.created") {
                        if (event.item?.content) {
                            const content = Array.isArray(event.item.content)
                                ? event.item.content
                                : [event.item.content];

                            content.forEach((c: any) => {
                                if (c.type === "text" && c.text?.toLowerCase().includes("summary")) {
                                    setSummary(c.text);
                                }
                            });
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

            // Create and set local description
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send SDP to our backend
            const prescriptionContext = prescriptionUrls.join(", ");
            const sdpResponse = await fetch(
                `/api/realtime/session?prescriptions=${encodeURIComponent(prescriptionContext)}`,
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
            const event = {
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: "Please provide a comprehensive summary of our consultation including medications discussed, symptoms reported, health concerns identified, recommendations given, and suggested next steps.",
                        },
                    ],
                },
            };
            dcRef.current.send(JSON.stringify(event));
        }
    };

    const endConsultation = () => {
        setStatus("ended");

        // Request summary if not already received
        if (!summary) {
            requestSummary();
            // Wait a bit for the summary
            setTimeout(() => {
                cleanup();
                if (summary) {
                    onComplete(summary);
                } else {
                    onComplete("Consultation completed. Summary not available.");
                }
            }, 3000);
        } else {
            cleanup();
            onComplete(summary);
        }
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
                        Click below to start a voice consultation with the AI doctor. Make sure your microphone is working.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 max-w-md">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                )}

                <Button
                    onClick={startConsultation}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                >
                    🎤 Start Voice Consultation
                </Button>

                <div className="bg-dark-400 border border-dark-500 rounded-lg p-4 max-w-md">
                    <p className="text-sm text-dark-700">
                        💡 <strong>Tip:</strong> Speak clearly about your symptoms, medications, and health concerns. The AI will ask follow-up questions.
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
            </div>
        );
    }

    if (status === "ended") {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p className="text-white text-lg">Generating consultation summary...</p>
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
                <p className="text-dark-700 mt-2">Duration: {formatDuration(duration)}</p>
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

            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                    <p className="text-red-500 text-sm">{error}</p>
                </div>
            )}
        </div>
    );
};
