"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface AIConsultChatProps {
    consultationId: string;
    initialMessages?: Message[];
    onSendMessage: (message: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const AIConsultChat = ({ consultationId, initialMessages = [], onSendMessage }: AIConsultChatProps) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setIsLoading(true);

        // Add user message immediately
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

        // Send to AI
        const result = await onSendMessage(userMessage);

        if (result.success && result.message) {
            setMessages((prev) => [...prev, { role: "assistant", content: result.message! }]);
        } else {
            // Show error
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
            ]);
        }

        setIsLoading(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark-300 border border-dark-500 rounded-lg">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-dark-500">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    AI Doctor Chat
                </h3>
                <p className="text-sm text-dark-700 mt-1">Ask questions about your prescriptions and symptoms</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-dark-400 text-white border border-dark-500"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-dark-400 border border-dark-500 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-dark-500">
                <div className="flex gap-3">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message... (Press Enter to send)"
                        className="flex-1 bg-dark-400 border-dark-500 text-white placeholder:text-dark-700 resize-none"
                        rows={2}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-6"
                    >
                        {isLoading ? "Sending..." : "Send"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
