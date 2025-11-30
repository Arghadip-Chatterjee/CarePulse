"use client";
import React from "react";
import { BentoGrid, BentoGridItem } from "./BentoGrid";
import {
  IconClipboardHeart,
  IconDeviceDesktopAnalytics,
  IconFileBroken,
  IconSignature,
  IconTableColumn,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { Particles } from "@/components/ui/particles";

export function Features() {
  return (
    <section id="features" className="bg-gradient-to-b from-dark-300 via-dark-200 to-dark-300 relative py-20 overflow-hidden">
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={50}
        ease={80}
        color="#22c55e"
        size={0.5}
        staticity={30}
        refresh={false}
      />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl"
      ></motion.div>

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
      ></motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <BentoGrid className="max-w-4xl mx-auto">
          {items.map((item, i) => (
            <BentoGridItem
              key={i}
              title={item.title}
              description={item.description}
              header={item.header}
              icon={item.icon}
              className={i === 3 || i === 6 ? "md:col-span-2" : ""}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

const Skeleton = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 relative overflow-hidden group">
    <motion.div
      animate={{
        x: ["-100%", "100%"],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
    ></motion.div>
  </div>
);

const items = [
  {
    title: "Easy Scheduling",
    description: "Book appointments with your favorite doctors in seconds.",
    header: <Skeleton />,
    icon: <IconClipboardHeart className="h-4 w-4 text-green-500" />,
  },
  {
    title: "Secure Records",
    description: "Your health data is encrypted and safe with us.",
    header: <Skeleton />,
    icon: <IconFileBroken className="h-4 w-4 text-green-500" />,
  },
  {
    title: "Telehealth",
    description: "Consult with doctors from the comfort of your home.",
    header: <Skeleton />,
    icon: <IconSignature className="h-4 w-4 text-green-500" />,
  },
  {
    title: "Multi-Platform",
    description:
      "Access CarePulse on any device, anywhere, anytime. Seamless experience across mobile and desktop.",
    header: <Skeleton />,
    icon: <IconTableColumn className="h-4 w-4 text-green-500" />,
  },
  {
    title: "Smart Notifications",
    description: "Never miss an appointment with our automated reminders.",
    header: <Skeleton />,
    icon: <IconDeviceDesktopAnalytics className="h-4 w-4 text-green-500" />,
  },
];
