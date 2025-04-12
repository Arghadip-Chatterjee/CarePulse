import { Models } from "node-appwrite";

declare type DoctorSpecialization =
    | "General Practitioner"
    | "Cardiologist"
    | "Dermatologist"
    | "Neurologist"
    | "Pediatrician"
    | "Orthopedic Surgeon"
    | "Psychiatrist"
    | "Other";

export interface CreateDoctorParams {
    name: string;
    email: string;
    phone: string;
}

export interface RegisterDoctorParams extends CreateDoctorParams {
    userId: string;
    specialization: DoctorSpecialization;
    licenseNumber: string;
    yearsOfExperience: string;
    hospitalAffiliation: string;
    identificationType?: string;
    identificationNumber?: string;
    identificationDocument?: FormData;
    consultationFee: string;
    availableTimingsOnline: String[],
    availableTimingsOffline: String[],
    isVerified: boolean;
}

export interface Doctor extends Models.Document {
    userId: string;
    name: string;
    email: string;
    phone: string;
    specialization: DoctorSpecialization;
    licenseNumber: string;
    yearsOfExperience: string;
    hospitalAffiliation: string;
    identificationType?: string;
    identificationNumber?: string;
    identificationDocument?: FormData | undefined;
    consultationFee: string;
    availableTimingsOnline: String[],
    availableTimingsOffline: String[],
    isVerified: boolean;
}
