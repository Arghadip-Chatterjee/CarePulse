import { Models } from "node-appwrite";

export interface Patient extends Models.Document {
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date;
  gender: Gender;
  address: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  primaryPhysician: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  allergies: string | undefined;
  currentMedication: string | undefined;
  familyMedicalHistory: string | undefined;
  pastMedicalHistory: string | undefined;
  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocument: FormData | undefined;
  privacyConsent: boolean;
}

export interface Appointment extends Models.Document {
  patient: Patient;
  schedule: Date;
  status: Status;
  doctor: string;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
  appointmenttype: string;
  doctorId: string;
  prescription: String[];
}

export enum Specialization {
  GeneralPractitioner = "General Practitioner",
  Cardiologist = "Cardiologist",
  Dermatologist = "Dermatologist",
  Neurologist = "Neurologist",
  Pediatrician = "Pediatrician",
  OrthopedicSurgeon = "Orthopedic Surgeon",
  Psychiatrist = "Psychiatrist",
  Other = "Other",
}

export interface Doctor extends Models.Document {
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialization: Specialization;
  licenseNumber: string;
  yearsOfExperience: string;
  hospitalAffiliation: string;
  consultationFee: string;
  availableTimingsOnline: String[],
  availableTimingsOffline: String[],
  isVerified: boolean;
}

export interface Prescription extends Models.Document {
  prescription_url: string;
  fileId: string;
  userId: string;
  uploaded_at: Date;
}
