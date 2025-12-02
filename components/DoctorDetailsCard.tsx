"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { updateDoctor } from "@/lib/actions/doctor.actions";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DoctorDetailsCardProps {
    doctor: any;
    userId: string;
}

// Inline Editable Field Component
const InlineEditableField = ({
    label,
    value,
    fieldName,
    doctorId,
    type = "text",
    onUpdate,
    color = "blue",
}: {
    label: string;
    value: string;
    fieldName: string;
    doctorId: string;
    type?: "text" | "number";
    onUpdate: () => void;
    color?: "blue" | "green";
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateDoctor(doctorId, { [fieldName]: editValue });
            setIsEditing(false);
            onUpdate();
            router.refresh();
        } catch (error) {
            console.error("Error updating field:", error);
            setEditValue(value); // Revert on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const colorClasses = {
        blue: "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10",
        green: "text-green-400 hover:text-green-300 hover:bg-green-500/10",
    };

    if (isEditing) {
        return (
            <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">{label}</p>
                <div className="flex items-center gap-2">
                    <Input
                        type={type}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-black-900 border-dark-600 text-white"
                        autoFocus
                    />
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-3"
                    >
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className={`text-xs uppercase tracking-wider ${color === "blue" ? "text-blue-400" : "text-green-400"} font-semibold mb-1`}>
                        {label}
                    </p>
                    <p className={`${color === "green" ? "text-lg text-green-400 font-bold" : "text-base text-white font-semibold"}`}>
                        {color === "green" && fieldName === "consultationFee" ? `$${value || "0"}` : value || "N/A"}
                        {fieldName === "yearsOfExperience" && " years"}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className={`flex items-center gap-1 ${colorClasses[color]} p-2 h-auto`}
                >
                    <Pencil className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
};

// Helper function to parse timing string (e.g., "Monday: 10:00 AM")
const parseTimingString = (timing: string) => {
    const parts = timing.split(":");
    if (parts.length < 2) return { day: "", time: "" };
    const day = parts[0].trim();
    const time = parts.slice(1).join(":").trim();
    return { day, time };
};

// Helper function to parse time string to Date
const parseTimeString = (timeString: string): Date | null => {
    try {
        const [time, period] = timeString.trim().split(" ");
        const [hours, minutes] = time.split(":").map(Number);
        let hour24 = hours;
        if (period === "PM" && hours !== 12) {
            hour24 = hours + 12;
        } else if (period === "AM" && hours === 12) {
            hour24 = 0;
        }
        const date = new Date();
        date.setHours(hour24, minutes, 0, 0);
        return date;
    } catch {
        return null;
    }
};

// Helper function to format time to string
const formatTimeString = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
};

const daysOfWeek = [
    { label: "Sunday", value: "Sunday" },
    { label: "Monday", value: "Monday" },
    { label: "Tuesday", value: "Tuesday" },
    { label: "Wednesday", value: "Wednesday" },
    { label: "Thursday", value: "Thursday" },
    { label: "Friday", value: "Friday" },
    { label: "Saturday", value: "Saturday" },
];

// Inline Editable Timings Component
const InlineEditableTimings = ({
    doctor,
    onUpdate,
}: {
    doctor: any;
    onUpdate: () => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Parse existing timings
    const parseTimings = (timings: string[]) => {
        const selectedDays: string[] = [];
        const timeSlots: Record<string, Date> = {};

        timings.forEach((timing) => {
            const { day, time } = parseTimingString(timing);
            if (day && time) {
                selectedDays.push(day);
                const timeDate = parseTimeString(time);
                if (timeDate) {
                    timeSlots[day] = timeDate;
                }
            }
        });

        return { selectedDays, timeSlots };
    };

    const initialOnline = parseTimings(doctor.availableTimingsOnline || []);
    const initialOffline = parseTimings(doctor.availableTimingsOffline || []);

    const [onlineSelectedDays, setOnlineSelectedDays] = useState<string[]>(initialOnline.selectedDays);
    const [onlineTimeSlots, setOnlineTimeSlots] = useState<Record<string, Date>>(initialOnline.timeSlots);
    const [offlineSelectedDays, setOfflineSelectedDays] = useState<string[]>(initialOffline.selectedDays);
    const [offlineTimeSlots, setOfflineTimeSlots] = useState<Record<string, Date>>(initialOffline.timeSlots);

    const toggleDay = (day: string, type: "online" | "offline") => {
        if (type === "online") {
            setOnlineSelectedDays((prev) =>
                prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
            );
        } else {
            setOfflineSelectedDays((prev) =>
                prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
            );
        }
    };

    const handleTimeChange = (day: string, date: Date | null, type: "online" | "offline") => {
        if (!date) return;
        if (type === "online") {
            setOnlineTimeSlots((prev) => ({ ...prev, [day]: date }));
        } else {
            setOfflineTimeSlots((prev) => ({ ...prev, [day]: date }));
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const onlineTimings = onlineSelectedDays
                .filter((day) => onlineTimeSlots[day])
                .map((day) => `${day}: ${formatTimeString(onlineTimeSlots[day])}`);

            const offlineTimings = offlineSelectedDays
                .filter((day) => offlineTimeSlots[day])
                .map((day) => `${day}: ${formatTimeString(offlineTimeSlots[day])}`);

            await updateDoctor(doctor.id, {
                availableTimingsOnline: onlineTimings,
                availableTimingsOffline: offlineTimings,
            } as any);
            setIsEditing(false);
            onUpdate();
            router.refresh();
        } catch (error) {
            console.error("Error updating timings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        const resetOnline = parseTimings(doctor.availableTimingsOnline || []);
        const resetOffline = parseTimings(doctor.availableTimingsOffline || []);
        setOnlineSelectedDays(resetOnline.selectedDays);
        setOnlineTimeSlots(resetOnline.timeSlots);
        setOfflineSelectedDays(resetOffline.selectedDays);
        setOfflineTimeSlots(resetOffline.timeSlots);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="space-y-5 md:col-span-2 bg-black-900/50 rounded-lg p-6 border border-dark-700/30 shadow-lg">
                <div className="flex items-center justify-between border-b-2 border-purple-500/30 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                        Available Timings
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Online Timings Editor */}
                    <div className="bg-black-800/50 rounded-lg p-4 border border-dark-600/20">
                        <p className="text-sm font-semibold text-green-400 mb-4 uppercase tracking-wide">
                            Online Appointments
                        </p>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {daysOfWeek.map((day) => (
                                    <label
                                        key={day.value}
                                        className="flex items-center space-x-2 cursor-pointer px-3 py-1 rounded-md bg-black-900/50 border border-dark-600/30 hover:border-green-500/50 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={onlineSelectedDays.includes(day.value)}
                                            onChange={() => toggleDay(day.value, "online")}
                                            className="h-4 w-4 text-green-500 focus:ring-green-500"
                                        />
                                        <span className="text-sm text-white">{day.label}</span>
                                    </label>
                                ))}
                            </div>
                            {onlineSelectedDays.map((day) => (
                                <div key={day} className="flex items-center gap-3 bg-black-900/50 p-3 rounded-md border border-dark-600/20">
                                    <span className="text-sm font-medium text-white min-w-[80px]">{day}</span>
                                    <DatePicker
                                        selected={onlineTimeSlots[day] || null}
                                        onChange={(date) => handleTimeChange(day, date as Date, "online")}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={30}
                                        timeCaption="Time"
                                        dateFormat="h:mm aa"
                                        className="flex-1 bg-black-800 border border-dark-600 text-white rounded-md px-3 py-2"
                                        wrapperClassName="flex-1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Offline Timings Editor */}
                    <div className="bg-black-800/50 rounded-lg p-4 border border-dark-600/20">
                        <p className="text-sm font-semibold text-blue-400 mb-4 uppercase tracking-wide">
                            Offline Appointments
                        </p>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {daysOfWeek.map((day) => (
                                    <label
                                        key={day.value}
                                        className="flex items-center space-x-2 cursor-pointer px-3 py-1 rounded-md bg-black-900/50 border border-dark-600/30 hover:border-blue-500/50 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={offlineSelectedDays.includes(day.value)}
                                            onChange={() => toggleDay(day.value, "offline")}
                                            className="h-4 w-4 text-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-white">{day.label}</span>
                                    </label>
                                ))}
                            </div>
                            {offlineSelectedDays.map((day) => (
                                <div key={day} className="flex items-center gap-3 bg-black-900/50 p-3 rounded-md border border-dark-600/20">
                                    <span className="text-sm font-medium text-white min-w-[80px]">{day}</span>
                                    <DatePicker
                                        selected={offlineTimeSlots[day] || null}
                                        onChange={(date) => handleTimeChange(day, date as Date, "offline")}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={30}
                                        timeCaption="Time"
                                        dateFormat="h:mm aa"
                                        className="flex-1 bg-black-800 border border-dark-600 text-white rounded-md px-3 py-2"
                                        wrapperClassName="flex-1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 md:col-span-2 bg-black-900/50 rounded-lg p-6 border border-dark-700/30 shadow-lg">
            <div className="flex items-center justify-between border-b-2 border-purple-500/30 pb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                    Available Timings
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                    <Pencil className="w-4 h-4" />
                    Edit
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black-800/50 rounded-lg p-4 border border-dark-600/20">
                    <p className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">Online Appointments</p>
                    <div className="flex flex-wrap gap-2">
                        {doctor.availableTimingsOnline && doctor.availableTimingsOnline.length > 0 ? (
                            doctor.availableTimingsOnline.map((timing: string, index: number) => (
                                <span
                                    key={index}
                                    className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 text-sm font-medium border border-green-500/40 shadow-md hover:bg-green-500/30 transition-colors"
                                >
                                    {timing}
                                </span>
                            ))
                        ) : (
                            <p className="text-dark-400 text-sm italic">No online timings set</p>
                        )}
                    </div>
                </div>
                <div className="bg-black-800/50 rounded-lg p-4 border border-dark-600/20">
                    <p className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wide">Offline Appointments</p>
                    <div className="flex flex-wrap gap-2">
                        {doctor.availableTimingsOffline && doctor.availableTimingsOffline.length > 0 ? (
                            doctor.availableTimingsOffline.map((timing: string, index: number) => (
                                <span
                                    key={index}
                                    className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm font-medium border border-blue-500/40 shadow-md hover:bg-blue-500/30 transition-colors"
                                >
                                    {timing}
                                </span>
                            ))
                        ) : (
                            <p className="text-dark-400 text-sm italic">No offline timings set</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DoctorDetailsCard = ({ doctor, userId }: DoctorDetailsCardProps) => {
    const router = useRouter();

    if (!doctor) return null;

    const handleUpdate = () => {
        router.refresh();
    };

    return (
        <section className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Doctor Details</h2>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-black-800 to-black-900 p-8 shadow-2xl border border-dark-700/50 backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Information */}
                    <div className="space-y-5 bg-black-900/50 rounded-lg p-6 border border-dark-700/30 shadow-lg">
                        <h3 className="text-xl font-bold text-white border-b-2 border-green-500/30 pb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                            Personal Information
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Full Name</p>
                                <p className="text-base text-white font-semibold">{doctor.name || "N/A"}</p>
                            </div>
                            <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Email</p>
                                <p className="text-base text-white font-semibold break-all">{doctor.email || "N/A"}</p>
                            </div>
                            <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Phone</p>
                                <p className="text-base text-white font-semibold">{doctor.phone || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-5 bg-black-900/50 rounded-lg p-6 border border-dark-700/30 shadow-lg">
                        <h3 className="text-xl font-bold text-white border-b-2 border-blue-500/30 pb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                            Professional Information
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">Specialization</p>
                                <p className="text-base text-white font-semibold">{doctor.specialization || "N/A"}</p>
                            </div>
                            <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">License Number</p>
                                <p className="text-base text-white font-semibold">{doctor.licenseNumber || "N/A"}</p>
                            </div>

                            <InlineEditableField
                                label="Years of Experience"
                                value={doctor.yearsOfExperience || ""}
                                fieldName="yearsOfExperience"
                                doctorId={doctor.id}
                                type="text"
                                onUpdate={handleUpdate}
                                color="blue"
                            />

                            <InlineEditableField
                                label="Hospital Affiliation"
                                value={doctor.hospitalAffiliation || ""}
                                fieldName="hospitalAffiliation"
                                doctorId={doctor.id}
                                type="text"
                                onUpdate={handleUpdate}
                                color="blue"
                            />

                            <InlineEditableField
                                label="Consultation Fee"
                                value={doctor.consultationFee || "0"}
                                fieldName="consultationFee"
                                doctorId={doctor.id}
                                type="text"
                                onUpdate={handleUpdate}
                                color="green"
                            />
                        </div>
                    </div>

                    {/* Available Timings */}
                    <InlineEditableTimings doctor={doctor} onUpdate={handleUpdate} />

                    {/* Verification Status */}
                    <div className="md:col-span-2 bg-black-900/50 rounded-lg p-4 border border-dark-700/30 shadow-lg">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-dark-300 uppercase tracking-wide">Verification Status</p>
                            <span
                                className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg ${doctor.isVerified
                                    ? "bg-green-500/30 text-green-300 border-2 border-green-500/50"
                                    : "bg-yellow-500/30 text-yellow-300 border-2 border-yellow-500/50"
                                    }`}
                            >
                                {doctor.isVerified ? "✓ Verified" : "⏳ Pending Verification"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
