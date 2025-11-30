"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconMail, IconBrandTwitter, IconBrandLinkedin } from "@tabler/icons-react";
import { motion, scale } from "motion/react";
import { Particles } from "@/components/ui/particles";

export const Contact = () => {
  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-dark-200 via-dark-300 to-dark-200 relative overflow-hidden">
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={30}
        ease={60}
        color="#ffffff"
        size={0.3}
        staticity={50}
        refresh={false}
      />

      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-10"></div>

      {/* Glowing orb */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"
      ></motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-neutral-400 text-lg mb-8"
          >
            We'd love to hear from you. Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions.
          </motion.p>

          <div className="flex flex-col items-center justify-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link href="mailto:support@carepulse.com">
                <Button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-6 px-8 text-lg rounded-full transition-all shadow-lg hover:shadow-green-500/30 hover:scale-105 flex items-center gap-2">
                  <IconMail className="w-5 h-5" />
                  Contact Support
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center gap-6 mt-4"
            >
              <Link href="#" className="text-light-200 hover:text-green-500 transition-all hover:scale-110">
                <IconBrandTwitter className="w-6 h-6" />
              </Link>
              <Link href="#" className="text-light-200 hover:text-green-500 transition-all hover:scale-110">
                <IconBrandLinkedin className="w-6 h-6" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
