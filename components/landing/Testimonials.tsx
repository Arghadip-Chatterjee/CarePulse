"use client";

import React from "react";
import { InfiniteMovingCards } from "./InfiniteMovingCards";
import { motion } from "motion/react";
import { Particles } from "@/components/ui/particles";

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 flex flex-col antialiased bg-gradient-to-br from-dark-300 via-dark-200 to-dark-300 items-center justify-center relative overflow-hidden">
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={40}
        ease={70}
        color="#3b82f6"
        size={0.4}
        staticity={40}
        refresh={false}
      />

      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.05),transparent_50%)]"></div>

      {/* Floating particles */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-10 left-20 w-2 h-2 bg-green-500 rounded-full blur-sm"
      ></motion.div>

      <motion.div
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute top-40 right-32 w-3 h-3 bg-blue-400 rounded-full blur-sm"
      ></motion.div>

      <motion.div
        animate={{
          y: [0, -25, 0],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute bottom-20 left-1/3 w-2 h-2 bg-green-400 rounded-full blur-sm"
      ></motion.div>

      <div className="relative z-10 w-full">
        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
        />
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote:
      "CarePulse has revolutionized how I manage my appointments. It's incredibly intuitive and saves me so much time.",
    name: "Sarah Jenkins",
    title: "Patient",
  },
  {
    quote:
      "As a doctor, this platform helps me keep track of my schedule effortlessly. The interface is clean and professional.",
    name: "Dr. Michael Chen",
    title: "Cardiologist",
  },
  {
    quote: "I love the secure records feature. Knowing my health data is safe gives me peace of mind.",
    name: "Emily Rodriguez",
    title: "Patient",
  },
  {
    quote:
      "The telehealth integration is a game-changer. I can consult with my doctor without leaving my house.",
    name: "David Kim",
    title: "Patient",
  },
  {
    quote:
      "Efficient, reliable, and user-friendly. CarePulse is exactly what the healthcare industry needed.",
    name: "Dr. Amanda Smith",
    title: "General Practitioner",
  },
];
