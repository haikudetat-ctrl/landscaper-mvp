import Link from "next/link";

import { Card } from "@/components/ui/card";

export const metadata = {
  title: "HDZ Hardscaping & Landscaping LLC",
  description: "Hardscaping, landscaping, and concrete work for South Jersey homeowners.",
};

const services = [
  { title: "Lawn Maintenance", blurb: "Routine cuts, edging, and cleanup to keep curb appeal sharp." },
  { title: "Hardscaping", blurb: "Built features that add structure, function, and long-term value." },
  { title: "Outdoor Lighting", blurb: "Highlight your property and improve night-time safety." },
  { title: "Top Soil", blurb: "Fresh grade-ready top soil for healthier lawn and landscape beds." },
  { title: "Sod", blurb: "Fast green-up with clean installation and post-install guidance." },
  { title: "Tree Service", blurb: "Trim, cleanup, and property-safe tree work." },
  { title: "Pavers", blurb: "Durable, clean paver installs for patios, walkways, and entries." },
  { title: "Retaining Walls", blurb: "Stabilize elevation and define your outdoor space." },
  { title: "Sidewalks", blurb: "Straight, safe concrete paths with clean finish work." },
  { title: "Driveways / Concrete", blurb: "Strong concrete flatwork built for everyday use." },
];

const steps = [
  {
    title: "Share your project",
    description: "Tell us the property address, services needed, timeline, and budget in our quick intake form.",
  },
  {
    title: "Get your plan",
    description: "HDZ reviews your details and photos, then we reach out with scope, recommendations, and next steps.",
  },
  {
    title: "Build with confidence",
    description: "We schedule your work, complete the job, and keep communication clear from start to finish.",
  },
];

export default function HdzLandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="bg-[radial-gradient(circle_at_top_right,_rgba(132,204,22,0.22),_transparent_40%),radial-gradient(circle_at_12%_14%,_rgba(251,146,60,0.18),_transparent_26%)]">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-lime-300">HDZ Hardscaping & Landscaping LLC</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Hardscaping & Landscaping Built Around Your Property
          </h1>
          <p className="mt-5 max-w-3xl text-base text-zinc-200 sm:text-lg">
            Lawn maintenance, pavers, retaining walls, outdoor lighting, sod, tree service, sidewalks, and concrete work
            for South Jersey homeowners.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/intake/hdz"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-orange-400 bg-lime-400 px-6 py-3 text-base font-extrabold text-black transition hover:bg-lime-300"
            >
              Start Your Project
            </Link>
            <a
              href="tel:+18563947978"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-orange-400 px-6 py-3 text-base font-bold text-white transition hover:border-orange-300 hover:bg-zinc-900"
            >
              Call 856-394-7978
            </a>
          </div>

          <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-lime-400/35 bg-zinc-950/70 px-3 py-2 font-semibold text-lime-200">South Jersey Local Crew</div>
            <div className="rounded-xl border border-orange-400/35 bg-zinc-950/70 px-3 py-2 font-semibold text-orange-200">Fast Estimate Follow-Up</div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 font-semibold text-zinc-100">Residential + Hardscape Projects</div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-12">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Services</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card
                key={service.title}
                className="border-orange-400/60 bg-zinc-950/90 p-4 text-white shadow-[0_20px_45px_-34px_rgba(251,146,60,0.7)]"
              >
                <p className="text-base font-bold">{service.title}</p>
                <p className="mt-1 text-sm text-zinc-300">{service.blurb}</p>
                <Link href="/intake/hdz" className="mt-3 inline-flex text-xs font-black uppercase tracking-[0.12em] text-lime-300 hover:text-lime-200">
                  Request Estimate
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-12">
          <h2 className="text-2xl font-black text-white sm:text-3xl">How It Works</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="border-lime-400/40 bg-zinc-950/90 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{step.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-12">
          <Card className="border-2 border-orange-400 bg-zinc-950 p-6 text-white sm:p-8">
            <h2 className="text-2xl font-black sm:text-3xl">Ready to price your project?</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300 sm:text-base">
              Start intake now for faster scheduling and cleaner estimates.
            </p>
            <p className="mt-2 text-sm font-semibold text-lime-200">Most homeowners finish the form in under 3 minutes.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/intake/hdz"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-orange-400 bg-lime-400 px-6 py-3 text-base font-extrabold text-black transition hover:bg-lime-300"
              >
                Start Your Project
              </Link>
              <a
                href="tel:+18563947978"
                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-orange-400 px-6 py-3 text-base font-bold text-white transition hover:bg-zinc-900"
              >
                Call 856-394-7978
              </a>
            </div>
          </Card>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white sm:text-3xl">Before & After</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Gallery Placeholder</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="flex min-h-44 items-center justify-center rounded-2xl border border-zinc-700 bg-[linear-gradient(130deg,rgba(255,255,255,0.03),rgba(132,204,22,0.1))] text-sm font-semibold text-zinc-300"
              >
                Before / After {slot}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6 sm:pb-12">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Why Homeowners Choose HDZ</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "South Jersey Service",
              "Clear Project Communication",
              "Reliable Scheduling",
              "Property-First Craftsmanship",
            ].map((badge) => (
              <div key={badge} className="rounded-2xl border border-lime-400/35 bg-zinc-950/80 px-4 py-3 text-center text-sm font-bold text-lime-200">
                {badge}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-950/80 p-5">
            <h3 className="text-lg font-black text-white">Quick Answers</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <p className="text-sm font-bold text-zinc-100">How do I get started?</p>
                <p className="mt-1 text-sm text-zinc-300">Tap “Start Your Project,” choose services, and share property details. We follow up fast.</p>
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <p className="text-sm font-bold text-zinc-100">Can I upload project photos?</p>
                <p className="mt-1 text-sm text-zinc-300">Yes. Upload photos in the intake form so HDZ can scope your project faster.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-400 bg-black/95 p-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex w-full max-w-6xl gap-2">
          <Link
            href="/intake/hdz"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-orange-400 bg-lime-400 px-4 text-sm font-black text-black"
          >
            Start Your Project
          </Link>
          <a
            href="tel:+18563947978"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-orange-400 px-4 text-sm font-black text-white"
          >
            Call Now
          </a>
        </div>
      </div>
    </main>
  );
}
