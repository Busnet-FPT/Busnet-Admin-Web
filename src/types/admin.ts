/* ─── Admin profile ──────────────────────────────────────────────────────── */

export interface AdminProfile {
  _id: string
  username: string
  email: string
  fullName?: string
  role: 'ADMIN'
  status: string
  avatar?: string | null
  isEmailVerified: boolean
  lastLoginAt?: string | null
}

/* ─── Shared ─────────────────────────────────────────────────────────────── */

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BanHistoryEntry {
  _id: string
  type: 'TEMPORARY' | 'PERMANENT'
  reason: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  startedAt: string
  expiredAt?: string | null
  unbannedAt?: string | null
}

/* ─── Partners ───────────────────────────────────────────────────────────── */

export interface PartnerInformationSummary {
  operatorName: string
  operatorPhone?: string
  isVerified: boolean
  ratingAvg: number
  totalReviews: number
}

export interface PartnerListItem {
  _id: string
  username: string
  email: string
  phone?: string
  fullName?: string
  status: string
  profilePicture?: string | null
  isEmailVerified: boolean
  isPhoneVerified: boolean
  banCounts: number
  createdAt: string
  updatedAt: string
  partnerInformation: PartnerInformationSummary | null
}

export interface PartnerDetailAccount extends PartnerListItem {
  gender?: string
  dob?: string
}

export interface PartnerInformationDetail extends PartnerInformationSummary {
  accountId: string
  description?: string
  amenities?: string[]
  bankName?: string
  bankAccountName?: string
  bankNumber?: string
  bankBranch?: string
  businessLicense?: string | null
  taxCode?: string | null
  verifiedAt?: string | null
  profilePicture?: string | null
  coverImage?: string | null
}

export interface PartnerSubscriptionDetail {
  _id: string
  subscriptionDate: string
  expirationDate: string
  subscriptionStatus: string
  autoRenew: boolean
  planId: {
    _id: string
    planName: string
    code: string
    price: number
    durationDays: number
  } | null
}

export interface PartnerDetail {
  partner: PartnerDetailAccount
  partnerInformation: PartnerInformationDetail | null
  subscription: PartnerSubscriptionDetail | null
  banHistory: BanHistoryEntry[]
}

/* ─── Subscription plans ─────────────────────────────────────────────────── */

export interface SubscriptionPlan {
  _id: string
  planName: string
  code: string
  description?: string
  price: number
  durationDays: number
  discount: number
  planFeatures: string[]
  maxBuses: number
  maxRoutes: number
  isPopular: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
  chartColor?: string | null
  activeSubscriberCount?: number
  createdAt: string
  updatedAt: string
}

/* ─── Customers ──────────────────────────────────────────────────────────── */

export interface CustomerListItem {
  _id: string
  username: string
  email: string
  phone?: string
  fullName?: string
  status: string
  profilePicture?: string | null
  isEmailVerified: boolean
  isPhoneVerified: boolean
  banCounts: number
  createdAt: string
  updatedAt: string
}

export interface BookingStatEntry {
  _id: string   // booking status value
  count: number
}

export interface CustomerDetail {
  customer: CustomerListItem & {
    gender?: string
    dob?: string
  }
  banHistory: BanHistoryEntry[]
  bookingStats: BookingStatEntry[]
}

/* ─── Reports ────────────────────────────────────────────────────────────── */

export type ReportTargetType = 'TRIP' | 'BOOKING' | 'OPERATOR' | 'PAYMENT' | 'SYSTEM' | 'OTHER'
export type ReportStatus     = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED' | 'DISMISSED'

export interface ReportReporter {
  _id: string
  fullName?: string
  email: string
  username: string
  phone?: string
  profilePicture?: string | null
}

export interface ReportTarget {
  model: 'Trip' | 'Booking' | 'Account' | 'Transaction'
  id: string
  label: string | null
}

export interface ReportListItem {
  _id: string
  targetType: ReportTargetType
  target: ReportTarget | null
  reason: string
  description?: string
  status: ReportStatus
  evidence?: string[]
  resolvedAt?: string | null
  adminNote?: string | null
  createdAt: string
  reporterId: ReportReporter
}

export interface ReportDetail extends ReportListItem {
  resolvedBy: Pick<ReportReporter, '_id' | 'fullName' | 'email'> | null
}

/* ─── Pending License Reviews ────────────────────────────────────────────── */

export interface PendingRegistrationListItem {
  _id: string
  accountId: {
    _id: string
    email: string
    fullName?: string
    phone?: string
    status: string
    createdAt: string
  }
  operatorName: string
  operatorPhone?: string
  licenseStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  businessLicense?: string | null
  taxCode?: string | null
  selectedPlanId?: {
    _id: string
    planName: string
    price: number
    discount: number
    durationDays: number
  } | null
  reviewedBy?: {
    _id: string
    fullName?: string
    email: string
  } | null
  reviewedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

/* ─── Blog Approvals ─────────────────────────────────────────────────────── */

export type BlogStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED'

export interface BlogAuthor {
  _id: string
  fullName?: string
  email: string
  profilePicture?: string | null
}

export interface BlogListItem {
  _id: string
  title: string
  slug: string
  summary?: string
  coverImage: string
  tag: string
  status: BlogStatus
  rejectionReason?: string | null
  authorId: BlogAuthor
  partnerName?: string
  views: number
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

