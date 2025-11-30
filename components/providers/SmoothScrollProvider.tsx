"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Global Lenis instance
let lenisInstance: Lenis | null = null;

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Initialize Lenis with slower, smoother settings
        const lenis = new Lenis({
            duration: 2.0, // Increased for slower, smoother scrolling (gives animations time)
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easing function
            orientation: "vertical", // Vertical scrolling
            gestureOrientation: "vertical",
            smoothWheel: true, // Enable smooth scrolling for mouse wheel
            wheelMultiplier: 0.6, // Reduced for slower scroll speed
            touchMultiplier: 1.5, // Touch scroll speed
            infinite: false,
        });

        // Store global instance
        lenisInstance = lenis;

        // Animation frame loop
        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Cleanup
        return () => {
            lenis.destroy();
            lenisInstance = null;
        };
    }, []);

    return <>{children}</>;
}

// Helper function to scroll to element with Lenis
export function scrollToElement(target: string | HTMLElement, options?: { offset?: number; duration?: number }) {
    if (!lenisInstance) return;

    const element = typeof target === "string" ? document.querySelector(target) : target;
    if (!element) return;

    lenisInstance.scrollTo(element as HTMLElement, {
        offset: options?.offset ?? 0,
        duration: options?.duration ?? 2.5, // Slower duration for navbar clicks
        easing: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1), // Smooth easing
    });
}

// Helper to get Lenis instance
export function getLenis() {
    return lenisInstance;
}
