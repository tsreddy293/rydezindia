import PageLayout from "@/components/layout/PageLayout";
import Hero from "@/components/home/Hero";
import TrustStats from "@/components/home/TrustStats";
import WhyRydez from "@/components/home/WhyRydez";
import Categories from "@/components/home/Categories";
import OwnerEarnings from "@/components/home/OwnerEarnings";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Home",
  description:
    "Rydez India — India's premium vehicle sharing marketplace. Book verified rides, return journeys, and self-drive cars. Vehicle owners earn ₹20,000–₹50,000 per month.",
  path: "",
});

export default function Home() {
  return (
    <PageLayout>
      <Hero />
      <TrustStats />
      <WhyRydez />
      <Categories />
      <OwnerEarnings />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
    </PageLayout>
  );
}
