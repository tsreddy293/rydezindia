"use client";

import { DollarSign, Car, Calendar, CheckCircle, TrendingUp, Bell, MapPin, Wifi } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";

const DASHBOARD_DATA = {
  totalEarnings: 145800,
  activeVehicles: 2,
  upcomingBookings: 3,
  completedTrips: 47,
  aiEarningsPrediction: 52000,
  bookingRequests: [
    { id: "1", vehicle: "Hyundai Creta", customer: "Sneha G.", dates: "Mar 15-17", amount: 7497, status: "pending" as const },
    { id: "2", vehicle: "Honda City", customer: "Arun K.", dates: "Mar 20-22", amount: 5397, status: "pending" as const },
    { id: "3", vehicle: "Hyundai Creta", customer: "Priya M.", dates: "Mar 10-12", amount: 7497, status: "accepted" as const },
  ],
  vehicles: [
    { id: "1", name: "Hyundai Creta", status: "active" as const, gpsStatus: "online" as const, earnings: 89400 },
    { id: "2", name: "Honda City", status: "on-trip" as const, gpsStatus: "online" as const, earnings: 56400 },
  ],
};

export default function OwnerDashboardPage() {
  const d = DASHBOARD_DATA;

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Owner Dashboard</h1>
            <p className="text-gray-600">Manage your vehicles and earnings</p>
          </div>
          <Button href="/owner/register" variant="primary" size="sm">Add Vehicle</Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: DollarSign, label: "Total Earnings", value: `₹${d.totalEarnings.toLocaleString()}`, color: "text-green-600" },
            { icon: Car, label: "Active Vehicles", value: d.activeVehicles, color: "text-primary" },
            { icon: Calendar, label: "Upcoming Bookings", value: d.upcomingBookings, color: "text-blue-600" },
            { icon: CheckCircle, label: "Completed Trips", value: d.completedTrips, color: "text-purple-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
              <Icon className={`h-8 w-8 ${color} mb-3`} />
              <p className="text-2xl font-bold text-secondary">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-primary to-accent p-6 mb-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-6 w-6" />
            <h3 className="text-lg font-semibold">AI Earnings Prediction</h3>
          </div>
          <p className="text-3xl font-bold">₹{d.aiEarningsPrediction.toLocaleString()}</p>
          <p className="text-white/80 text-sm mt-1">Projected earnings for next 30 days based on demand patterns</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-secondary">Booking Requests</h3>
            </div>
            <div className="space-y-4">
              {d.bookingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="font-medium text-secondary">{req.vehicle}</p>
                    <p className="text-sm text-gray-500">{req.customer} · {req.dates}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">₹{req.amount.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    }`}>{req.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Car className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-secondary">Vehicle Status</h3>
            </div>
            <div className="space-y-4">
              {d.vehicles.map((v) => (
                <div key={v.id} className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-secondary">{v.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === "active" ? "bg-green-100 text-green-700" :
                      v.status === "on-trip" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}>{v.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Wifi className={`h-3.5 w-3.5 ${v.gpsStatus === "online" ? "text-green-500" : "text-red-500"}`} />
                      GPS {v.gpsStatus}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      ₹{v.earnings.toLocaleString()} earned
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
