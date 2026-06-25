/** Rydez India — Supabase database types */

export type UserRole = "rider" | "owner" | "admin";
export type OwnerStatus = "pending" | "approved" | "rejected";
export type VehicleOwnerStatus = "pending" | "approved" | "rejected";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type JourneyStatus = "available" | "booked" | "completed" | "cancelled";
export type BookingType = "return_journey" | "self_drive" | "with_driver";
export type ListingAvailability = "available" | "unavailable" | "booked" | "completed" | "cancelled";
export type VehicleType =
  | "Hatchback"
  | "Sedan"
  | "SUV"
  | "MUV"
  | "Luxury"
  | "Tempo Traveller"
  | "Mini Bus"
  | "Bus";

export interface User {
  id: string;
  name: string;
  mobile: string | null;
  email: string;
  city: string | null;
  role: UserRole;
  is_blocked?: boolean;
  created_at: string;
}

export interface VehicleOwner {
  id: string;
  owner_id: string | null;
  name: string;
  mobile: string;
  email: string;
  city: string;
  aadhaar_number: string;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  vehicle_model: string;
  seating_capacity: number;
  status: VehicleOwnerStatus;
  created_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  vehicle_name?: string | null;
  vehicle_type: string;
  vehicle_number: string;
  fuel_type?: string | null;
  transmission?: string | null;
  seats: number;
  photos?: string[];
  status?: string;
  created_at: string;
}

export interface PlatformStats {
  vehicleOwners: number;
  vehicles: number;
  vehiclesTableCount: number;
  approvedVehicles: number;
  pendingVehicles: number;
  rejectedVehicles: number;
  bookings: number;
  returnJourneys: number;
  selfDriveVehicles: number;
  driverVehicles: number;
  todaysBookings: number;
  monthlyRevenue: number;
  users: number;
  revenue: number;
  pendingApprovals: number;
  pendingKyc: number;
  approvedKyc: number;
  pendingDocuments: number;
  approvedDocuments: number;
  pendingOwners: number;
  approvedOwners: number;
  rejectedOwners: number;
  pendingOwnerKyc: number;
  approvedOwnerKyc: number;
  pendingCustomerKyc: number;
  pendingCustomers: number;
  approvedCustomers: number;
  pendingVehicleApprovals: number;
  returnJourneyRevenue: number;
  driverVehicleRevenue: number;
  selfDriveRevenue: number;
  recentBookings?: RecentBooking[];
  recentVehicles?: RecentVehicle[];
  recentOwners?: RecentOwner[];
  revenueTrend?: ChartPoint[];
  bookingTrend?: ChartPoint[];
  vehicleCategoryDistribution?: ChartPoint[];
  error?: string | null;
}

export interface OwnerStats extends PlatformStats {
  activeVehicles: number;
  bookingRequests: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface RecentBooking {
  id: string;
  booking_type: BookingType | string;
  amount: number;
  booking_status: string;
  created_at: string;
}

export interface BookingConfirmation {
  id: string;
  booking_reference?: string;
  booking_type: BookingType | string;
  passenger_name: string;
  mobile: string;
  amount: number;
  booking_status: string;
  payment_status: string;
  pickup_location?: string;
  drop_location?: string;
  pickup_date?: string;
  pickup_time?: string;
  trip_type?: string;
  vehicle_id?: string;
  owner_id?: string;
  created_at: string;
  protection_selected?: boolean;
  flexible_cancellation?: boolean;
  flexible_cancellation_fee?: number;
  protection_fee?: number;
  protection_plan_name?: string;
  protection_purchase_date?: string;
  protection_status?: string;
  trip_fare_amount?: number;
  security_deposit_amount?: number;
}

export type VehicleDetail =
  | (SearchResult & { module: "return_journey"; price_label: string })
  | (DriverVehicleResult & { module: "with_driver"; price_label: string })
  | (SelfDriveResult & { module: "self_drive"; price_label: string });

export interface RecentVehicle {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_number: string;
  status: string;
  created_at: string;
}

export interface RecentOwner {
  id: string;
  owner_name: string;
  mobile: string;
  verification_status: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  booking_type?: BookingType;
  vehicle_id?: string | null;
  vehicle_name: string;
  vehicle_number?: string;
  vehicle_type: string;
  fuel_type?: string;
  has_ac?: boolean;
  rating?: number;
  photos?: string[];
  owner_name: string;
  from_city: string;
  to_city: string;
  journey_date: string;
  journey_time?: string;
  available_seats: number;
  price: number;
  return_from_city?: string;
  return_to_city?: string;
  return_departure_time?: string;
  discount_percent?: number;
  driver_name?: string;
  driver_phone?: string;
}

export interface SelfDriveResult {
  id: string;
  booking_type: "self_drive";
  vehicle_id: string;
  vehicle_name: string;
  vehicle_type: string;
  registration_number?: string;
  fuel_type?: string;
  has_ac?: boolean;
  rating?: number;
  owner_name: string;
  owner_id?: string;
  owner_city?: string;
  pickup_city: string;
  drop_city: string;
  journey_date: string;
  journey_time: string;
  available_seats: number;
  price: number;
  status: string;
  location: string;
  daily_rent: number;
  security_deposit: number;
  availability: string;
  photos: string[];
  seats: number;
}

export interface DriverVehicleResult {
  id: string;
  booking_type: "with_driver";
  vehicle_id: string;
  vehicle_name: string;
  vehicle_number?: string;
  vehicle_type: string;
  fuel_type?: string;
  has_ac?: boolean;
  rating?: number;
  photos?: string[];
  owner_name: string;
  owner_id?: string;
  pickup_city: string;
  drop_city: string;
  journey_date: string;
  journey_time: string;
  available_seats: number;
  price: number;
  status: string;
  driver_name: string;
  driver_phone: string;
  rate_per_km: number;
  base_location: string;
  availability: string;
  seats: number;
}

export interface RegisterOwnerInput {
  name: string;
  mobile: string;
  email: string;
  city: string;
  password?: string;
  address: string;
  aadhaar_number: string;
  pan_number: string;
  license_number: string;
  bank_account: string;
  ifsc_code: string;
  bank_name: string;
}

export interface RegisterVehicleInput {
  owner_id: string;
  vehicle_type: string;
  vehicle_number: string;
  seats: number;
  from_city: string;
  to_city: string;
  price: number;
  vehicle_name?: string;
  fuel_type?: string;
  transmission?: string;
  journey_date?: string;
  journey_time?: string;
}

export interface RegisterSelfDriveInput {
  owner_id: string;
  vehicle_id?: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_number: string;
  fuel_type?: string;
  transmission?: string;
  seats: number;
  pickup_city?: string;
  drop_city?: string;
  journey_date?: string;
  journey_time?: string;
  available_seats?: number;
  price?: number;
  location: string;
  daily_rent: number;
  security_deposit: number;
  photos?: string[];
}

export interface RegisterDriverVehicleInput {
  owner_id: string;
  vehicle_id?: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_number: string;
  fuel_type?: string;
  transmission?: string;
  seats: number;
  pickup_city?: string;
  drop_city?: string;
  journey_date?: string;
  journey_time?: string;
  available_seats?: number;
  price?: number;
  driver_name: string;
  driver_phone: string;
  rate_per_km: number;
  base_location: string;
  local_package_price?: number;
  outstation_package_price?: number;
  airport_transfer_price?: number;
}

export interface CreateBookingInput {
  ride_id: string;
  passenger_name: string;
  mobile: string;
  seats_booked: number;
  seat_numbers?: number[];
  special_instructions?: string;
  discount_amount?: number;
  rural_pickup_point_id?: string;
  coupon_code?: string;
}

export interface CreateMarketplaceBookingInput {
  booking_type: Exclude<BookingType, "return_journey">;
  reference_id: string;
  vehicle_id: string;
  passenger_name: string;
  mobile: string;
  amount: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  kyc_status: string;
  is_blocked: boolean;
  created_at: string;
  verified: boolean;
  lastLogin: string;
  status: string;
}

export interface AdminOwnerManagementRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  vehicleCount: number;
  kycStatus: OwnerStatus;
  ownerStatus: OwnerStatus;
  created_at: string;
  canApproveKyc: boolean;
  canApproveOwner: boolean;
  documents: AdminOwnerKycRecord["documents"];
  aadhaar: string;
  license: string;
  vehicles: AdminOwnerVehicleSummary[];
}

export interface AdminOwnerVehicleSummary {
  id: string;
  name: string;
  registration_number: string;
  status: string;
}

export interface AdminCustomerManagementRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  kycStatus: string;
  userStatus: string;
  bookings: number;
  created_at: string;
  canApproveKyc: boolean;
  canApproveCustomer: boolean;
  documents: AdminCustomerKycRecord["documents"];
  aadhaar: string;
  is_blocked: boolean;
}

export interface AdminOwnerRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  status: OwnerStatus;
  vehicleCount: number;
  created_at: string;
}

export interface AdminVehicleRecord {
  id: string;
  vehicle_name: string;
  vehicle_category: string;
  registration_number: string;
  approval_status: string;
  documents_status?: string;
  owner_id: string;
  owner_name: string;
  owner_status: OwnerStatus;
  kyc_status?: string;
  canApprove: boolean;
  approvalBlockedReason?: string | null;
  vehicle_photo_url: string | null;
  rc_document_url: string | null;
  insurance_document_url: string | null;
  service_self_drive: boolean;
  service_with_driver: boolean;
  service_local_rental: boolean;
  service_return_journey: boolean;
}

export interface ApprovalLogRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  approved_by: string | null;
  approver_name?: string;
  remarks: string | null;
  created_at: string;
}

export interface AdminVehicleDetailRecord extends AdminVehicleRecord {
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  fuel_type: string;
  transmission: string;
  seating_capacity: number;
  ac: boolean;
  city: string | null;
  daily_fare: number;
  security_deposit: number;
  images: string[];
  created_at: string;
  updated_at: string;
  approval_logs: ApprovalLogRecord[];
}

export interface AdminOwnerKycRecord {
  id: string;
  kycRecordId: string | null;
  name: string;
  email: string;
  mobile: string;
  aadhaar: string;
  license: string;
  status: OwnerStatus;
  canApprove: boolean;
  documents: {
    aadhaar?: string;
    license?: string;
    selfie?: string;
    address_proof?: string;
    pan?: string;
    rc?: string;
    insurance?: string;
  };
}

export interface AdminCustomerKycRecord {
  id: string;
  kycRecordId: string | null;
  name: string;
  email: string;
  mobile: string;
  aadhaar: string;
  status: string;
  documents: {
    aadhaar_front?: string;
    aadhaar_back?: string;
    driving_license?: string;
    selfie?: string;
    /** @deprecated legacy */
    aadhaar?: string;
    license?: string;
  };
}

export interface AdminVehicleDocumentRecord {
  id: string;
  vehicle_name: string;
  registration_number: string;
  owner_name: string;
  rc_url: string | null;
  insurance_url: string | null;
  pollution_url: string | null;
  fitness_url: string | null;
  verification_status: string;
  owner_kyc_approved: boolean;
}

export interface OwnerDashboardMetrics {
  totalVehicles: number;
  approvedVehicles: number;
  pendingVehicles: number;
  activeBookings: number;
  upcomingTrips: number;
  earningsToday: number;
  earningsThisMonth: number;
}

export interface UserBooking {
  id: string;
  booking_reference?: string;
  booking_type: string;
  passenger_name: string;
  amount: number;
  booking_status: string;
  payment_status: string;
  pickup_location?: string;
  drop_location?: string;
  pickup_date?: string;
  pickup_time?: string;
  created_at: string;
}

export interface UserBookingExtended extends UserBooking {
  cancellation_status?: string | null;
  cancelled_at?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  refund_processed_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_charges?: number | null;
  flexible_cancellation?: boolean | null;
  protection_selected?: boolean | null;
  flexible_cancellation_fee?: number | null;
}

export interface MyBookingRecord extends UserBookingExtended {
  vehicle_id?: string;
  reference_id?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  vehicle_image?: string | null;
  return_date?: string;
  return_time?: string;
  return_location?: string;
  special_instructions?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
