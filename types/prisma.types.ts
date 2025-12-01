import { User, Patient, Doctor, Appointment, Prescription } from '@prisma/client'
import { Specialization } from './appwrite.types'

// Re-export Prisma types
export type { User, Patient, Doctor, Appointment, Prescription }

// Extended types with relations
export type PatientWithUser = Patient & {
  user: User
}

export type DoctorWithUser = Doctor & {
  user: User
}

export type AppointmentWithRelations = Appointment & {
  user: User
  patient: PatientWithUser
  doctor: DoctorWithUser
  prescriptions: Prescription[]
}

export type PrescriptionWithRelations = Prescription & {
  user: User
  appointment?: Appointment | null
}

// Create/Update parameter types
export interface CreateUserParams {
  name: string
  email: string
  phone: string
}

export interface RegisterPatientParams extends CreateUserParams {
  birthDate: Date
  gender: Gender
  address: string
  occupation: string
  emergencyContactName: string
  emergencyContactNumber: string
  insuranceProvider?: string
  insurancePolicyNumber?: string
  allergies?: string
  currentMedication?: string
  familyMedicalHistory?: string
  pastMedicalHistory?: string
  identificationType?: string
  identificationNumber?: string
  identificationDocument?: FormData
  privacyConsent: boolean
}

export interface CreateDoctorParams extends CreateUserParams {
  specialization: Specialization
  licenseNumber: string
  yearsOfExperience: string
  hospitalAffiliation: string
  identificationType?: string
  identificationNumber?: string
  identificationDocument?: FormData
  consultationFee: string
  availableTimingsOnline: string[]
  availableTimingsOffline: string[]
}

export interface CreateAppointmentParams {
  userId: string
  patientId: string
  doctorId: string
  doctorName: string
  schedule: Date
  reason: string
  status: Status
  note?: string
  appointmentType: string
  meeting?: string
  prescription?: string[]
}

export interface UpdateAppointmentParams {
  appointmentId: string
  userId: string
  appointment: Partial<CreateAppointmentParams>
  type: string
}

export interface CreatePrescriptionParams {
  userId: string
  appointmentId?: string
  prescriptionUrl: string
  fileId: string
}

// Response types for API
export interface AppointmentsResponse {
  totalCount: number
  scheduledCount: number
  pendingCount: number
  cancelledCount: number
  documents: AppointmentWithRelations[]
}

export interface DoctorsResponse {
  totalCount: number
  verifiedCount: number
  unverifiedCount: number
  documents: DoctorWithUser[]
}

export interface PatientsResponse {
  totalCount: number
  documents: PatientWithUser[]
}

export interface PrescriptionsResponse {
  totalCount: number
  documents: Prescription[]
}

