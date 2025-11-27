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

export interface Patient {
  id: string;
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
  insuranceProvider: string;
  insurancePolicyNumber: string;
  allergies: string | undefined;
  currentMedication: string | undefined;
  familyMedicalHistory: string | undefined;
  pastMedicalHistory: string | undefined;
  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocumentId: string | undefined;
  identificationDocumentUrl: string | undefined;
  privacyConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
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
  prescription: string[];
  meeting: string;
  hasVisited: boolean;
  createdAt: Date;
  updatedAt: Date;
}



export interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialization: Specialization;
  licenseNumber: string;
  yearsOfExperience: string;
  hospitalAffiliation: string;
  consultationFee: string;
  availableTimingsOnline: string[];
  availableTimingsOffline: string[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id: string;
  prescription_url: string;
  user_id: string;
  uploaded_at: Date;
  createdAt: Date;
  updatedAt: Date;
  appointmentId?: string;
}
