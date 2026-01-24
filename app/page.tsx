import { Hero, HowItWorks, StatsBar, Testimonials, FinalCTA, Footer } from "@/components/landing"

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col">
      <Hero />
      <HowItWorks />
      <StatsBar />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </main>
  )
}
