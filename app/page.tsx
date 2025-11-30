import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Testimonials } from "@/components/landing/Testimonials";
import { Contact } from "@/components/landing/Contact";
import { Footer } from "@/components/landing/Footer";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { FAQ } from "@/components/landing/FAQ";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-dark-300 antialiased selection:bg-green-500 selection:text-white">
      <Navbar />
      <Hero />
      <SectionHeader title="Why Choose" highlight="CarePulse?" className="min-h-[30vh] md:min-h-[40vh]" />
      <Features />
      <SectionHeader title="What Our Users" highlight="Say" className="min-h-[30vh] md:min-h-[40vh]" />
      <Testimonials />
      <SectionHeader title="Frequently Asked" highlight="Questions" className="min-h-[30vh] md:min-h-[40vh]" />
      <FAQ />
      <SectionHeader title="Get in" highlight="Touch" className="min-h-[30vh] md:min-h-[40vh]" />
      <Contact />
      <Footer />
    </main>
  );
}
