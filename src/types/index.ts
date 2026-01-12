export interface User {
  uid: string
  email: string
  name: string
  phone: string
  description?: string
  photoURL?: string
  role: 'trainer' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export interface Event {
  id: string
  title: string
  trainerId: string
  trainerName: string
  date: Date
  duration: number // minutes
  type: string
  capacity: number | null // null = unlimited
  attendees: Attendee[]
  waitlist: Attendee[]
  createdAt: Date
  updatedAt: Date
}

export interface Attendee {
  id: string
  name: string
  email: string
  phone: string
  bookedAt: Date
}

export interface InviteCode {
  id: string
  code: string
  createdBy: string
  createdAt: Date
  used: boolean
  usedBy?: string
  usedAt?: Date
}

export interface AppSettings {
  backgroundImageUrl?: string
  trainingTypes: string[]
}

export interface Booking {
  id: string
  eventId: string
  name: string
  email: string
  phone: string
  status: 'confirmed' | 'waitlist'
  position?: number // position in waitlist
  createdAt: Date
}

export interface Statistics {
  totalTrainings: number
  totalBookings: number
  activeTrainers: number
  trainingsByTrainer: { [trainerId: string]: number }
  bookingsByMonth: { [month: string]: number }
}



