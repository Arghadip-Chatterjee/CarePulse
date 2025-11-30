"use client";
import Link from "next/link";
import Image from "next/image";
import { Particles } from "@/components/ui/particles";

export const Footer = () => {
  return (
    <footer className="bg-dark-300 py-12 border-t border-dark-500 relative overflow-hidden">
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={25}
        ease={50}
        color="#22c55e"
        size={0.3}
        staticity={60}
        refresh={false}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/icons/logo-full.svg"
                height={40}
                width={160}
                alt="CarePulse"
                className="h-8 w-fit"
              />
            </Link>
            <p className="text-dark-600 mt-4 text-sm">
              © 2024 CarePulse. All rights reserved.
            </p>
          </div>

          <div className="flex gap-8">
            <Link href="#" className="text-dark-600 hover:text-green-500 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-dark-600 hover:text-green-500 transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="text-dark-600 hover:text-green-500 transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
