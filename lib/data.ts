import type { FAQ, Review, VehicleCategory } from "./types";

export const COMPANY = {
  name: "Rydez India",
  tagline: "Your Car. Your Income.",
  phone: "9494651116",
  whatsapp: "+919494651116",
  email: "info@rydezindia.com",
  website: "rydezindia.com",
};

export const HERO_BADGES = [
  "Verified Owners",
  "Verified Users",
  "AI Matching",
  "GPS Tracking",
  "Secure Payments",
  "24x7 Support",
];

export const CATEGORIES: { id: VehicleCategory; name: string; icon: string; count: number }[] = [
  { id: "hatchback", name: "Hatchback", icon: "🚗", count: 1240 },
  { id: "sedan", name: "Sedan", icon: "🚙", count: 2180 },
  { id: "suv", name: "SUV", icon: "🚐", count: 1560 },
  { id: "luxury", name: "Luxury", icon: "✨", count: 340 },
  { id: "electric", name: "Electric Vehicles", icon: "⚡", count: 520 },
  { id: "tempo", name: "Tempo Traveller", icon: "🚌", count: 180 },
];

export const FEATURES = [
  { title: "Verified Owners", description: "Every vehicle owner undergoes rigorous KYC and document verification.", icon: "ShieldCheck" },
  { title: "Verified Users", description: "All renters are verified with driving licence and identity checks.", icon: "UserCheck" },
  { title: "GPS Tracking", description: "Real-time vehicle tracking for safety and peace of mind.", icon: "MapPin" },
  { title: "Secure Payments", description: "Razorpay-powered encrypted payments with instant settlements.", icon: "CreditCard" },
  { title: "AI Matching", description: "Smart algorithms match vehicles with the right customers.", icon: "Brain" },
  { title: "Insurance Support", description: "Comprehensive insurance coverage for every trip.", icon: "Umbrella" },
  { title: "24x7 Support", description: "Round-the-clock customer support via chat, call, and WhatsApp.", icon: "Headphones" },
  { title: "Fraud Protection", description: "AI-powered fraud detection keeps every transaction secure.", icon: "Lock" },
];

export const AI_FEATURES = [
  "AI Pricing Engine",
  "AI Fraud Detection",
  "AI Risk Scoring",
  "AI Demand Prediction",
  "AI Earnings Forecast",
  "AI Vehicle Recommendation",
  "AI Customer Support Chatbot",
  "AI Return Journey Matching",
];

export const HOW_IT_WORKS = [
  { step: 1, title: "Register Vehicle", description: "Sign up and list your vehicle with photos and details." },
  { step: 2, title: "Upload Documents", description: "Submit RC, insurance, Aadhaar, PAN, and driving licence." },
  { step: 3, title: "Vehicle Verification", description: "Our team verifies your vehicle within 24 hours." },
  { step: 4, title: "Receive Bookings", description: "Get matched with verified users via AI." },
  { step: 5, title: "Earn Income", description: "Receive payments directly to your bank account." },
];

export const BOOKING_STEPS = [
  { id: 1, title: "Select Dates", description: "Choose your pickup and drop dates" },
  { id: 2, title: "Select Vehicle", description: "Browse and pick your ideal vehicle" },
  { id: 3, title: "KYC Verification", description: "Quick identity verification" },
  { id: 4, title: "Payment", description: "Secure Razorpay checkout" },
  { id: 5, title: "Confirmation", description: "Receive booking confirmation" },
  { id: 6, title: "Trip Tracking", description: "Track your trip in real-time" },
  { id: 7, title: "Completion", description: "Complete your journey" },
  { id: 8, title: "Review", description: "Rate your experience" },
];

export const INVESTOR_STATS = [
  { label: "Market Size", value: "₹2.5L Cr", description: "Indian mobility market by 2028" },
  { label: "Vehicle Owners", value: "30M+", description: "Idle vehicles across India" },
  { label: "Growth Rate", value: "32% CAGR", description: "Vehicle sharing segment" },
  { label: "Cities", value: "50+", description: "Expansion target by 2027" },
];

export const REVENUE_STREAMS = [
  { title: "Commission on Rentals", description: "15-20% commission on every booking" },
  { title: "Insurance Premiums", description: "Trip insurance and protection plans" },
  { title: "Premium Listings", description: "Featured vehicle placements for owners" },
  { title: "Fleet Partner Program", description: "Enterprise fleet management solutions" },
  { title: "AI Analytics", description: "Data insights for fleet operators" },
  { title: "Advertising", description: "In-app and platform advertising" },
];

export const REVIEWS: Review[] = [
  { id: "1", author: "Ramesh Patel", role: "owner", rating: 5, text: "Rydez helped me earn ₹45,000/month from my idle Creta. The AI matching is incredible!", date: "2025-12-15", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
  { id: "2", author: "Sneha Gupta", role: "customer", rating: 5, text: "Booked a one-way trip Hyderabad to Vijayawada. Smooth process, verified owner, great car!", date: "2026-01-20", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" },
  { id: "3", author: "Mohammed Ali", role: "owner", rating: 5, text: "Return journey matching doubled my earnings. My car never returns empty anymore.", date: "2026-02-01", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
  { id: "4", author: "Kavitha Rao", role: "customer", rating: 4, text: "Affordable luxury car rental for my wedding. Mercedes was pristine and owner was professional.", date: "2026-01-08", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
  { id: "5", author: "Arjun Desai", role: "owner", rating: 5, text: "Listed 3 vehicles on Rydez. Dashboard shows real-time earnings and GPS tracking works flawlessly.", date: "2026-02-10", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" },
  { id: "6", author: "Lisa Thomas", role: "customer", rating: 5, text: "Best alternative to Zoomcar! Better prices, verified owners, and the app is so intuitive.", date: "2026-02-28", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" },
];

export const FAQS: FAQ[] = [
  { question: "How does Rydez work?", answer: "Rydez India connects verified vehicle owners with verified users. Owners list their vehicles, users search and book, and our AI handles matching, pricing, and fraud detection. Payments are processed securely via Razorpay." },
  { question: "How do owners earn?", answer: "Owners earn by renting out idle vehicles. Set your own availability and pricing (with AI recommendations). Earnings are deposited directly to your bank account after each completed trip." },
  { question: "How is verification done?", answer: "Both owners and users undergo KYC verification including Aadhaar, PAN, driving licence, and selfie verification. Vehicles are verified with RC, insurance, and physical inspection." },
  { question: "How does one-way booking work?", answer: "Search for vehicles travelling your route (e.g., Hyderabad → Vijayawada). Book a seat or the entire vehicle for one-way journeys at lower prices than round-trip rentals." },
  { question: "What is return journey matching?", answer: "When a vehicle completes a one-way trip, our AI automatically finds return journey customers going the opposite direction, reducing empty return trips and increasing owner earnings." },
];

export const ADMIN_STATS = {
  totalOwners: 1,
  pendingApprovals: 0,
  totalVehicles: 1,
  pendingKYC: 0,
  totalBookings: 1,
  revenue: 2400,
  activeTrips: 2,
};
