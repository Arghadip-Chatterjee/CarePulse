"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DoctorDetailsModalProps {
    doctor: any;
    isOpen?: boolean;
    onClose?: () => void;
}

export const DoctorDetailsModal = ({ doctor, isOpen, onClose }: DoctorDetailsModalProps) => {
    if (!doctor) return null;

    const handleOpenChange = (open: boolean) => {
        if (!open && onClose) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl bg-dark-300 border-dark-500">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Doctor Information
                    </DialogTitle>
                    <DialogDescription className="text-dark-700">
                        Your assigned doctor's details
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Doctor Name and Specialization */}
                    <div className="bg-dark-400 border border-dark-500 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-white">{doctor.name}</h4>
                                <p className="text-green-500 text-sm font-medium">{doctor.specialization}</p>
                            </div>
                            {doctor.isVerified && (
                                <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
                                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs text-green-500">Verified</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contact & Key Details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-400 border border-dark-500 rounded-lg p-3">
                            <p className="text-xs text-dark-700 mb-1">Experience</p>
                            <p className="text-sm text-white font-medium">{doctor.yearsOfExperience} years</p>
                        </div>
                        <div className="bg-dark-400 border border-dark-500 rounded-lg p-3">
                            <p className="text-xs text-dark-700 mb-1">Consultation Fee</p>
                            <p className="text-sm text-white font-medium">₹{doctor.consultationFee}</p>
                        </div>
                        <div className="bg-dark-400 border border-dark-500 rounded-lg p-3">
                            <p className="text-xs text-dark-700 mb-1">Phone</p>
                            <p className="text-sm text-white font-medium">{doctor.phone}</p>
                        </div>
                        <div className="bg-dark-400 border border-dark-500 rounded-lg p-3">
                            <p className="text-xs text-dark-700 mb-1">Hospital</p>
                            <p className="text-sm text-white font-medium truncate">{doctor.hospitalAffiliation}</p>
                        </div>
                    </div>

                    {/* Available Timings - Compact */}
                    {(doctor.availableTimingsOnline?.length > 0 || doctor.availableTimingsOffline?.length > 0) && (
                        <div className="bg-dark-400 border border-dark-500 rounded-lg p-3">
                            <h5 className="text-sm font-semibold text-white mb-2">Available Timings</h5>
                            <div className="space-y-2">
                                {doctor.availableTimingsOnline?.length > 0 && (
                                    <div>
                                        <p className="text-xs text-dark-700 mb-1">Online</p>
                                        <div className="flex flex-wrap gap-1">
                                            {doctor.availableTimingsOnline.slice(0, 3).map((timing: string, index: number) => (
                                                <span key={index} className="bg-dark-300 text-green-500 px-2 py-0.5 rounded text-xs">
                                                    {timing}
                                                </span>
                                            ))}
                                            {doctor.availableTimingsOnline.length > 3 && (
                                                <span className="text-xs text-dark-700">+{doctor.availableTimingsOnline.length - 3} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {doctor.availableTimingsOffline?.length > 0 && (
                                    <div>
                                        <p className="text-xs text-dark-700 mb-1">Offline</p>
                                        <div className="flex flex-wrap gap-1">
                                            {doctor.availableTimingsOffline.slice(0, 3).map((timing: string, index: number) => (
                                                <span key={index} className="bg-dark-300 text-blue-500 px-2 py-0.5 rounded text-xs">
                                                    {timing}
                                                </span>
                                            ))}
                                            {doctor.availableTimingsOffline.length > 3 && (
                                                <span className="text-xs text-dark-700">+{doctor.availableTimingsOffline.length - 3} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <div className="flex justify-end mt-4">
                    <Button
                        onClick={() => onClose && onClose()}
                        className="bg-dark-500 hover:bg-dark-400 text-white px-6 py-2"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
