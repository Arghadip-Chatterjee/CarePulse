"use client";
import React from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "motion/react";
import { Particles } from "@/components/ui/particles";

export function FAQ() {
    return (
        <section id="faq" className="py-20 bg-gradient-to-b from-dark-300 via-dark-200 to-dark-300 relative overflow-hidden">
            {/* Particles background */}
            <Particles
                className="absolute inset-0"
                quantity={35}
                ease={75}
                color="#22c55e"
                size={0.35}
                staticity={45}
                refresh={false}
            />

            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.03),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.03),transparent_50%)]"></div>

            {/* Animated gradient orb */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-1/4 right-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"
            ></motion.div>

            <div className="container mx-auto px-4 relative z-10 max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8 }}
                >
                    <Accordion type="single" collapsible className="w-full">
                        {faqItems.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <AccordionItem value={`item-${index}`} className="border-dark-500 hover:border-green-500/30 transition-colors">
                                    <AccordionTrigger className="text-light-200 hover:text-green-500 hover:no-underline text-left">
                                        {item.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-neutral-400">
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                        ))}
                    </Accordion>
                </motion.div>
            </div>
        </section>
    );
}

const faqItems = [
    {
        question: "How do I book an appointment?",
        answer:
            "You can book an appointment by logging into your account, selecting a doctor, and choosing a suitable time slot. It's quick and easy!",
    },
    {
        question: "Is my medical data secure?",
        answer:
            "Yes, we use industry-standard encryption to ensure your health records and personal information are completely secure and private.",
    },
    {
        question: "Can I consult with doctors online?",
        answer:
            "Absolutely! We offer telehealth services that allow you to consult with top doctors from the comfort of your home via video calls.",
    },
    {
        question: "Is CarePulse free to use?",
        answer:
            "Creating an account and browsing doctors is free. Consultation fees vary depending on the doctor and the type of service you choose.",
    },
    {
        question: "How can I cancel or reschedule an appointment?",
        answer:
            "You can manage your appointments from your dashboard. Simply go to 'My Appointments' to cancel or reschedule with just a few clicks.",
    },
];
