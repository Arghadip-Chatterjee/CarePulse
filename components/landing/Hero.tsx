"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export const Hero = () => {
  return (
    <div className="h-screen w-full relative flex items-center justify-center overflow-hidden bg-white dark:bg-dark-300">

      <DottedGlowBackground
        className="absolute inset-0 z-0"
        opacity={0.6}
        gap={20}
        radius={2.5}
        colorLightVar="--color-neutral-500"
        glowColorLightVar="--color-neutral-600"
        colorDarkVar="--color-neutral-400"
        glowColorDarkVar="--color-green-500"
        backgroundOpacity={0}
        speedMin={0.2}
        speedMax={1.2}
        speedScale={1}
      />

      {/* Radial gradient for the container to give a faded look */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-dark-300 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] z-10"></div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20 mb-6"
          >
            Healthcare <span className="text-green-500">Simplified</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-neutral-400 max-w-lg mx-auto my-2 text-sm md:text-xl mb-10 relative z-20"
          >
            Manage your health with ease. Book appointments, access records, and consult with top doctors - all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20"
          >
            <Link href="/home">
              <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-green-500/20 transition-all hover:scale-105">
                Get Started
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="border-dark-500 bg-transparent text-light-200 hover:bg-dark-500 rounded-full px-8 py-6 text-lg hover:scale-105 transition-all">
                Learn More
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
