export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show"
export type PaymentStatus = "paid" | "pending" | "refunded"
export type BookingChannel = "website" | "phone" | "walk-in" | "partner"
export type ClientSegment = "vip" | "returning" | "new" | "at-risk"
export type ContactPreference = "email" | "phone" | "sms"

export interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  category: string
  color: string
  bufferTime: number
  capacity: number
  isActive: boolean
  featured: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Provider {
  id: string
  name: string
  role: string
  email: string
  phone: string
  bio: string
  specialties: string[]
  rating: number
  utilizationTarget: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  notes: string
  segment: ClientSegment
  preferredContact: ContactPreference
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Appointment {
  id: string
  clientId: string
  providerId: string
  serviceId: string
  startTime: Date
  endTime: Date
  /** endTime plus the service buffer; the period the provider is unavailable for other bookings. */
  blockedUntil?: Date
  status: AppointmentStatus
  paymentStatus: PaymentStatus
  channel: BookingChannel
  notes: string
  price: number
  location: string
  createdAt: Date
  updatedAt: Date
}

export interface Availability {
  id: string
  providerId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface TimeSlot {
  startTime: Date
  endTime: Date
  isAvailable: boolean
  providerId: string
}

export interface Payment {
  id: string
  appointmentId: string
  amount: number
  status: "pending" | "completed" | "failed" | "refunded"
  method: "cash" | "card" | "online"
  createdAt: Date
}

export interface CreateServiceData {
  name: string
  description: string
  duration: number
  price: number
  category?: string
  color?: string
  bufferTime?: number
  capacity?: number
  featured?: boolean
}

export interface CreateClientData {
  name: string
  email: string
  phone?: string
  notes?: string
  segment?: ClientSegment
  preferredContact?: ContactPreference
  tags?: string[]
}

export interface CreateProviderData {
  name: string
  email: string
  phone?: string
  specialties: string[]
  role?: string
  bio?: string
  rating?: number
  utilizationTarget?: number
}

export interface CreateAppointmentData {
  clientId: string
  providerId: string
  serviceId: string
  startTime: Date
  notes?: string
  status?: AppointmentStatus
  paymentStatus?: PaymentStatus
  channel?: BookingChannel
  location?: string
}

export interface CreateAvailabilityData {
  providerId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface BookingPlatformState {
  services: Service[]
  providers: Provider[]
  clients: Client[]
  appointments: Appointment[]
  availability: Availability[]
}
