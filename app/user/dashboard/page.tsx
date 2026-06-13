"use client";

import { Shield, Calendar, Heart, Bookmark, Car } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";

export default function UserDashboardPage() {
  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">My Dashboard</h1>
            <p className="text-gray-600">Manage your bookings and saved vehicles</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl">
            <Shield className="h-5 w-5" />
            KYC verified
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-secondary">Booking History</h3>
          </div>
          <div className="text-center py-10 rounded-xl bg-gray-50">
            <Car className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookings yet.</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Heart className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-secondary">Favorite Vehicles</h3>
          </div>
          <div className="text-center py-10 rounded-2xl bg-gray-50 border border-gray-100">
            <p className="text-gray-500">No vehicles available</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <Bookmark className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-secondary">Saved Vehicles</h3>
          </div>
          <div className="text-center py-10 rounded-2xl bg-gray-50 border border-gray-100">
            <p className="text-gray-500">No vehicles available</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button href="/search" variant="primary">Book Another Vehicle</Button>
        </div>
      </div>
    </PageLayout>
  );
}
