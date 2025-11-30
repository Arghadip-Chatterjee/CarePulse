"use client";
import React from "react";
import { LampContainer } from "@/components/ui/lamp";
import { motion } from "motion/react";

interface SectionHeaderProps {
    title: string;
    highlight: string;
    className?: string;
}

export function SectionHeader({ title, highlight, className }: SectionHeaderProps) {
    return (
        <LampContainer className={className}>
            <motion.h1
                initial={{ opacity: 0.5, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                    delay: 0.3,
                    duration: 0.8,
                    ease: "easeInOut",
                }}
                className="bg-gradient-to-br from-slate-300 to-slate-500 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
            >
                {title} <span className="text-green-500">{highlight}</span>
            </motion.h1>
        </LampContainer>
    );
}
