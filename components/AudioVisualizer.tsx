"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
    stream: MediaStream | null;
    isActive: boolean;
}

export const AudioVisualizer = ({ stream, isActive }: AudioVisualizerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const analyzerRef = useRef<AnalyserNode>();
    const audioContextRef = useRef<AudioContext>();

    useEffect(() => {
        if (!stream || !isActive) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            return;
        }

        // Set up audio context and analyzer
        const audioContext = new AudioContext();
        const analyzer = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyzer.fftSize = 256;
        source.connect(analyzer);

        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const draw = () => {
            if (!analyzer || !ctx || !canvas) return;

            animationRef.current = requestAnimationFrame(draw);

            analyzer.getByteFrequencyData(dataArray);

            // Clear canvas
            ctx.fillStyle = "rgb(15, 23, 42)"; // dark-300
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;

                // Gradient from green to blue
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, "rgb(34, 197, 94)"); // green-500
                gradient.addColorStop(1, "rgb(59, 130, 246)"); // blue-500

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stream, isActive]);

    return (
        <div className="w-full bg-dark-400 rounded-lg p-4 border border-dark-500">
            <canvas
                ref={canvasRef}
                width={600}
                height={120}
                className="w-full h-[120px]"
            />
        </div>
    );
};
