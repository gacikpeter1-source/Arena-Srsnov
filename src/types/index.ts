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

// Multi-trainer event system
export interface TrainerSlot {
  trainerId: string
  trainerName: string
  trainerPhoto?: string
  capacity: number // -1 = unlimited
  currentCount: number
  description?: string
  joinedAt: Date
}

export interface Event {
  id: string
  title: string
  type: string
  date: Date
  startTime: string // "14:00" format
  duration: number // minutes
  
  // Multi-trainer support
  trainers: { [trainerId: string]: TrainerSlot }
  
  // Legacy support (for migration)
  trainerId?: string
  trainerName?: string
  capacity?: number | null
  attendees?: Attendee[]
  waitlist?: Attendee[]
  
  // Recurring events
  recurringSeriesId?: string
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | null
  recurringDays?: number[] // For weekly: 0=Sun, 1=Mon, etc.
  
  createdBy: string
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

export interface Registration {
  id: string
  eventId: string
  trainerId: string
  userId: string // generated unique ID
  
  // User data
  name: string
  email: string
  phone: string
  
  // Generated data
  uniqueCode: string // 6-digit format "203-776"
  qrCodeData: string // encoded QR data
  
  // Status
  status: 'confirmed' | 'waitlist' | 'cancelled'
  position?: number // waitlist position
  registeredAt: Date
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



