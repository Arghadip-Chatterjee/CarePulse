"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { updatePatient } from "@/lib/actions/patient.prisma.actions";
import { useRouter } from "next/navigation";

interface PatientDetailsCardProps {
  patient: any;
  userId: string;
}

// Inline Editable Textarea Field Component
const InlineEditableTextarea = ({
  label,
  value,
  fieldName,
  userId,
  onUpdate,
  color = "blue",
}: {
  label: string;
  value: string;
  fieldName: string;
  userId: string;
  onUpdate: () => void;
  color?: "blue" | "green" | "purple";
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updatePatient(userId, { [fieldName]: editValue });
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
    setEditValue(value || "");
    setIsEditing(false);
  };

  const colorClasses = {
    blue: "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10",
    green: "text-green-400 hover:text-green-300 hover:bg-green-500/10",
    purple: "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10",
  };

  if (isEditing) {
    return (
      <div className="bg-black-800/50 rounded-md p-4 border border-dark-600/20">
        <p className={`text-xs uppercase tracking-wider ${color === "blue" ? "text-blue-400" : color === "green" ? "text-green-400" : "text-purple-400"} font-semibold mb-2`}>
          {label}
        </p>
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 bg-black-900 border-dark-600 text-white min-h-[100px] mb-3"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-4"
          >
            <Check className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black-800/50 rounded-md p-4 border border-dark-600/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-xs uppercase tracking-wider ${color === "blue" ? "text-blue-400" : color === "green" ? "text-green-400" : "text-purple-400"} font-semibold mb-2`}>
            {label}
          </p>
          <p className="text-base text-white font-medium whitespace-pre-wrap">
            {value || "No information provided"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className={`flex items-center gap-1 ${colorClasses[color]} p-2 h-auto ml-3`}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export const PatientDetailsCard = ({ patient, userId }: PatientDetailsCardProps) => {
  const router = useRouter();

  if (!patient) return null;

  const handleUpdate = () => {
    router.refresh();
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Patient Details</h2>
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
                <p className="text-base text-white font-semibold">{patient.name || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Email</p>
                <p className="text-base text-white font-semibold break-all">{patient.email || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Phone</p>
                <p className="text-base text-white font-semibold">{patient.phone || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Date of Birth</p>
                <p className="text-base text-white font-semibold">{formatDate(patient.birthDate)}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Gender</p>
                <p className="text-base text-white font-semibold">{patient.gender || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Address</p>
                <p className="text-base text-white font-semibold">{patient.address || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Occupation</p>
                <p className="text-base text-white font-semibold">{patient.occupation || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Contact & Insurance Information */}
          <div className="space-y-5 bg-black-900/50 rounded-lg p-6 border border-dark-700/30 shadow-lg">
            <h3 className="text-xl font-bold text-white border-b-2 border-blue-500/30 pb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              Contact & Insurance
            </h3>
            <div className="space-y-4">
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">Emergency Contact Name</p>
                <p className="text-base text-white font-semibold">{patient.emergencyContactName || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">Emergency Contact Number</p>
                <p className="text-base text-white font-semibold">{patient.emergencyContactNumber || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">Insurance Provider</p>
                <p className="text-base text-white font-semibold">{patient.insuranceProvider || "N/A"}</p>
              </div>
              <div className="bg-black-800/50 rounded-md p-3 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">Insurance Policy Number</p>
                <p className="text-base text-white font-semibold">{patient.insurancePolicyNumber || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Medical Information - Editable */}
          <div className="space-y-5 md:col-span-2 bg-black-900/50 rounded-lg p-6 border border-dark-700/30 shadow-lg">
            <h3 className="text-xl font-bold text-white border-b-2 border-purple-500/30 pb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
              Medical Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InlineEditableTextarea
                label="Allergies"
                value={patient.allergies || ""}
                fieldName="allergies"
                userId={userId}
                onUpdate={handleUpdate}
                color="purple"
              />
              <InlineEditableTextarea
                label="Current Medications"
                value={patient.currentMedication || ""}
                fieldName="currentMedication"
                userId={userId}
                onUpdate={handleUpdate}
                color="purple"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-black-800/50 rounded-md p-4 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2">Family Medical History</p>
                <p className="text-base text-white font-medium whitespace-pre-wrap">
                  {patient.familyMedicalHistory || "No information provided"}
                </p>
              </div>
              <div className="bg-black-800/50 rounded-md p-4 border border-dark-600/20">
                <p className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2">Past Medical History</p>
                <p className="text-base text-white font-medium whitespace-pre-wrap">
                  {patient.pastMedicalHistory || "No information provided"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

