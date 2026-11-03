import { Hero } from "@/components/home/hero";
import {
  Contact,
  Ecosystem,
  Faq,
  Gallery,
  Pricing,
  StudioOverview,
  Workflow,
} from "@/components/home/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Workflow />
      <StudioOverview />
      <Gallery />
      <Ecosystem />
      <Pricing />
      <Faq />
      <Contact />
    </>
  );
}
