"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { scrollToElement } from "@/components/providers/SmoothScrollProvider";
import { Particles } from "@/components/ui/particles";

export const Navbar = () => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (previous !== undefined && latest > previous && latest > 150) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  });

  const scrollToSection = (id: string) => {
    scrollToElement(`#${id}`, { offset: -80, duration: 2.5 });
  };

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={visible ? "visible" : "hidden"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 overflow-hidden",
        scrollY.get() > 50 ? "bg-dark-300/80 backdrop-blur-md border-b border-dark-500" : "bg-transparent"
      )}
    >
      {/* Particles background - only visible when navbar has background */}
      {scrollY.get() > 50 && (
        <Particles
          className="absolute inset-0"
          quantity={15}
          ease={40}
          color="#22c55e"
          size={0.2}
          staticity={70}
          refresh={false}
        />
      )}

      <div className="container mx-auto flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2" onClick={() => scrollToElement("body", { duration: 2.0 })}>
          <Image
            src="/assets/icons/logo-full.svg"
            height={40}
            width={160}
            alt="CarePulse"
            className="h-8 w-fit md:h-10"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollToSection("features")} className="text-sm font-medium text-light-200 hover:text-green-500 transition-colors">
            Features
          </button>
          <button onClick={() => scrollToSection("testimonials")} className="text-sm font-medium text-light-200 hover:text-green-500 transition-colors">
            Testimonials
          </button>
          <button onClick={() => scrollToSection("contact")} className="text-sm font-medium text-light-200 hover:text-green-500 transition-colors">
            Contact
          </button>
        </div>

        <Link
          href="/home"
          className="rounded-full bg-green-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-green-600 hover:shadow-green-500/20"
        >
          Get Started
        </Link>
      </div>
    </motion.nav>
  );
};
