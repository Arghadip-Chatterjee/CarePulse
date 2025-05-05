"use client";

import { useState } from "react";

interface Appointment {
  $id: string;
  userId: string; // Add userId field
  patient: {
    name: string;
  };
}

export default function PrescriptionForm({
  userId,
  appointments,
}: {
  userId: string;
  appointments: Appointment[];
}) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAppointmentId) return alert("Please select an appointment.");
  
    setLoading(true);

    // Find the selected appointment to get the userId
    const selectedAppointment = appointments.find(appt => appt.$id === selectedAppointmentId);
    const appointmentUserId = selectedAppointment ? selectedAppointment.userId : "";
  
    const content = `
      Prescription for Appointment ID: ${selectedAppointmentId}
      -------------------------------------
      Medicine: ${medicine}
      Dosage: ${dosage}
      Instructions: ${instructions}
    `;
  
    const blob = new Blob([content], { type: "text/plain" });
    const file = new File([blob], `prescription-${selectedAppointmentId}-${Date.now()}.txt`);
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", appointmentUserId); // Store appointment's userId
    formData.append("appointmentId", selectedAppointmentId);
  
    const res = await fetch("/api/upload-prescription", {
      method: "POST",
      body: formData,
    });
  
    const data = await res.json();
  
    if (res.ok) {
      alert("Prescription Uploaded ✅");
      setMedicine("");
      setDosage("");
      setInstructions("");
      setSelectedAppointmentId("");
    } else {
      alert("Upload failed ❌: " + data.error);
    }
  
    setLoading(false);
  };
  
  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-lg space-y-6 border">
      <h2 className="text-2xl font-semibold text-gray-800">
        📝 Create Online Prescription
      </h2>

      {/* Appointment Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Appointment
        </label>
        <select
          value={selectedAppointmentId}
          onChange={(e) => setSelectedAppointmentId(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Appointment --</option>
          {appointments.map((appt) => (
            <option key={appt.$id} value={appt.$id}>
              {appt.$id} — {appt.patient.name}
            </option>
          ))}
        </select>
      </div>

      {/* Medicine */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Medicine
        </label>
        <input
          type="text"
          placeholder="e.g. Paracetamol"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Dosage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dosage
        </label>
        <input
          type="text"
          placeholder="e.g. 500mg twice a day"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instructions
        </label>
        <textarea
          placeholder="e.g. Take after food, for 5 days"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload Prescription"}
        </button>
      </div>
    </div>
  );
}