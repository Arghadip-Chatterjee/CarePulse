"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatDateTime } from "@/lib/utils";
import Image from "next/image";

interface AIConsultation {
  id: string;
  createdAt: string;
  status: string;
  consultationType: "text" | "voice";
  conversationSummary: string | null;
  conversationHistory: any[];
  prescriptionUrls: string[];
}

interface AIConsultationListProps {
  consultations: AIConsultation[];
}

export const AIConsultationList = ({ consultations }: AIConsultationListProps) => {
  if (!consultations || consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-dark-700 bg-dark-200 rounded-lg border border-dark-300">
        <p>No previous consultations found.</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {consultations.map((consultation) => (
        <AccordionItem
          key={consultation.id}
          value={consultation.id}
          className="bg-dark-200 rounded-lg border border-dark-300 px-4 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex w-full items-center justify-between pr-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full flex items-center justify-center ${
                  consultation.consultationType === "voice" 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-blue-500/10 text-blue-500"
                }`}>
                  {consultation.consultationType === "voice" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-16-semibold">
                    {formatDateTime(consultation.createdAt).dateTime}
                  </p>
                  <p className="text-xs text-dark-600 capitalize">
                    {consultation.consultationType} Consultation • <span className={consultation.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}>{consultation.status}</span>
                  </p>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-dark-700 border-t border-dark-400 pt-4">
            <div className="space-y-6">
              {consultation.prescriptionUrls && consultation.prescriptionUrls.length > 0 && (
                <div className="bg-dark-300 p-4 rounded-md">
                    <p className="text-sm font-medium text-dark-600 mb-3">Prescriptions Analyzed</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {consultation.prescriptionUrls.map((url, idx) => (
                            <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border border-dark-500 shrink-0">
                                <Image 
                                    src={url} 
                                    alt={`Prescription ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {consultation.conversationSummary && (
                <div className="bg-dark-300 p-5 rounded-md border border-dark-500">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Consultation Summary
                  </h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-300">
                    {consultation.conversationSummary}
                  </p>
                </div>
              )}

              <div className="bg-dark-300 p-5 rounded-md border border-dark-500">
                <h4 className="text-md font-semibold text-white mb-3">Full Conversation</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {consultation.conversationHistory
                        .filter((msg: any) => msg.role !== 'system')
                        .map((msg: any, idx: number) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-dark-600 mb-1 uppercase ml-1 mr-1">{msg.role}</span>
                            <div className={`p-3 rounded-lg text-sm max-w-[90%] ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600/20 text-blue-100 rounded-tr-none border border-blue-600/30' 
                                    : 'bg-dark-400 text-gray-300 rounded-tl-none border border-dark-500'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

