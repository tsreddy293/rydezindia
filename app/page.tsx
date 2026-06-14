import PageLayout from "@/components/layout/PageLayout";
import Hero from "@/components/home/Hero";
import StatsBar from "@/components/home/StatsBar";
import SearchSection from "@/components/home/SearchSection";
import Categories from "@/components/home/Categories";
import Features from "@/components/home/Features";
import UniqueFeatures from "@/components/home/UniqueFeatures";
import HowItWorks from "@/components/home/HowItWorks";
import AIFeatures from "@/components/home/AIFeatures";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import { getPlatformStats } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Home",
  description:
    "Rydez India — India's AI-powered vehicle sharing marketplace. Search vehicles, register your vehicle, and earn monthly income from verified bookings.",
  path: "",
});

export default async function Home() {
  const platformStats = await getPlatformStats();

  const stats = {
    vehicles: platformStats.vehicles,
    vehicleOwners: platformStats.vehicleOwners,
    bookings: platformStats.bookings,
    returnJourneys: platformStats.returnJourneys,
  };

  return (
    <PageLayout>
      <Hero />
      <SearchSection />
      <StatsBar stats={stats} />
      <Categories />
      <Features />
      <UniqueFeatures />
      <HowItWorks />
      <AIFeatures />
      <Testimonials />
      <FAQ />
      <CTA />
    </PageLayout>
  );
}
