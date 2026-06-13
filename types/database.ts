/** Rydez India — Supabase database types */

export type UserRole = "user" | "owner" | "admin";
export type VehicleOwnerStatus = "pending" | "approved" | "rejected";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type JourneyStatus = "available" | "booked" | "completed" | "cancelled";

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
  vehicle_type: string;
  vehicle_number: string;
  seats: number;
  from_city: string;
  to_city: string;
  price: number;
  created_at: string;
}

export interface PlatformStats {
  vehicleOwners: number;
  vehicles: number;
  vehiclesTableCount: number;
  bookings: number;
  returnJourneys: number;
  users: number;
  revenue: number;
  error?: string | null;
}

export interface SearchResult {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  owner_name: string;
  from_city: string;
  to_city: string;
  journey_date: string;
  available_seats: number;
  price: number;
}

export interface RegisterOwnerInput {
  name: string;
  mobile: string;
  email: string;
  city: string;
  aadhaar_number: string;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
}

export interface RegisterVehicleInput {
  owner_id: string;
  vehicle_type: string;
  vehicle_number: string;
  seats: number;
  from_city: string;
  to_city: string;
  price: number;
}

export interface CreateBookingInput {
  ride_id: string;
  passenger_name: string;
  mobile: string;
  seats_booked: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
