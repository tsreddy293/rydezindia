export type VehicleCategory =
  | "hatchback"
  | "sedan"
  | "suv"
  | "luxury"
  | "electric"
  | "tempo";

export type TripType = "one-way" | "round-trip";
export type DriveType = "self-drive" | "chauffeur";

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  image: string;
  images: string[];
  pricePerDay: number;
  pricePerKm: number;
  securityDeposit: number;
  protectionFee: number;
  rating: number;
  reviewCount: number;
  location: string;
  features: string[];
  specs: {
    fuel: string;
    transmission: string;
    seats: number;
    mileage: string;
    engine: string;
  };
  owner: {
    name: string;
    avatar: string;
    rating: number;
    trips: number;
    verified: boolean;
  };
  available: boolean;
  oneWay: boolean;
}

export interface Review {
  id: string;
  author: string;
  role: "owner" | "customer";
  rating: number;
  text: string;
  date: string;
  avatar: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface BookingStep {
  id: number;
  title: string;
  description: string;
}

export interface OwnerDashboardData {
  totalEarnings: number;
  activeVehicles: number;
  upcomingBookings: number;
  completedTrips: number;
  aiEarningsPrediction: number;
  bookingRequests: {
    id: string;
    vehicle: string;
    customer: string;
    dates: string;
    amount: number;
    status: "pending" | "accepted" | "rejected";
  }[];
  vehicles: {
    id: string;
    name: string;
    status: "active" | "inactive" | "on-trip";
    gpsStatus: "online" | "offline";
    earnings: number;
  }[];
}

export interface UserDashboardData {
  kycStatus: "pending" | "verified" | "rejected";
  bookingHistory: {
    id: string;
    vehicle: string;
    dates: string;
    amount: number;
    status: "completed" | "upcoming" | "cancelled";
  }[];
  savedVehicles: string[];
  favoriteVehicles: string[];
}
