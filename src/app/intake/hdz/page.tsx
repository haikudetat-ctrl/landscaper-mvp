import Link from "next/link";

import { submitHdzIntakeAction } from "@/app/intake/hdz/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormRow, inputClasses, selectClasses, textareaClasses } from "@/components/ui/forms";
import { leadServiceOptions } from "@/lib/validation/lead";

export const metadata = {
  title: "HDZ Project Intake",
  description: "Start your HDZ landscaping or hardscaping project intake.",
};

const timelineOptions = ["ASAP", "Within 30 days", "1-3 months", "Just planning"];
const budgetOptions = ["Under $2,500", "$2,500-$7,500", "$7,500-$15,000", "$15,000+"];

export default async function HdzIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;
  const submitted = params.submitted === "1";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-12">
        <Link href="/hdz" className="text-sm font-semibold text-lime-300 hover:text-lime-200">
          ← Back to HDZ Landing
        </Link>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">HDZ Hardscaping & Landscaping LLC</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Start Your Project</h1>
          <p className="mt-2 text-sm text-zinc-300 sm:text-base">
            Tell us about your property and project goals. We will follow up quickly with next steps.
          </p>
          <div className="mt-3 inline-flex rounded-full border border-lime-400/35 bg-zinc-950/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-lime-200">
            3-Minute Intake
          </div>
        </div>

        {submitted ? (
          <Card className="mt-6 border-lime-400/40 bg-lime-950/20">
            <CardHeader>
              <CardTitle className="text-lime-200">Request received</CardTitle>
              <CardDescription className="text-lime-100/80">
                Thanks for reaching out. HDZ will contact you shortly to review your project.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Card className="mt-6 border-orange-400/50 bg-zinc-950 text-white shadow-[0_20px_55px_-35px_rgba(255,120,56,0.6)]">
          <CardContent className="pt-6">
            <form action={submitHdzIntakeAction} className="space-y-5">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-3 text-sm text-zinc-200">
                Fill out the essentials now. We use this to prepare your estimate and schedule your follow-up.
              </div>
              <FormRow>
                <FormField label="Full name" name="name" required>
                  <input id="name" name="name" autoComplete="name" className={inputClasses()} required />
                </FormField>
                <FormField label="Phone" name="phone" required>
                  <input id="phone" name="phone" autoComplete="tel" className={inputClasses()} required />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Email" name="email">
                  <input id="email" name="email" type="email" autoComplete="email" className={inputClasses()} />
                </FormField>
                <FormField label="Preferred contact method" name="preferredContactMethod" required>
                  <select id="preferredContactMethod" name="preferredContactMethod" className={selectClasses()} defaultValue="" required>
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="phone">Phone Call</option>
                    <option value="text">Text Message</option>
                    <option value="email">Email</option>
                  </select>
                </FormField>
              </FormRow>

              <FormField label="Property address" name="propertyAddress" required>
                <input id="propertyAddress" name="propertyAddress" autoComplete="street-address" className={inputClasses()} required />
              </FormField>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-zinc-100">Services requested *</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {leadServiceOptions.map((service) => (
                    <label key={service} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100">
                      <input type="checkbox" name="servicesRequested" value={service} className="h-4 w-4 accent-lime-400" />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <FormField label="Project description" name="projectDescription" required>
                <textarea id="projectDescription" name="projectDescription" rows={4} className={textareaClasses()} required />
              </FormField>

              <FormRow>
                <FormField label="Timeline" name="timeline" required>
                  <select id="timeline" name="timeline" className={selectClasses()} defaultValue="" required>
                    <option value="" disabled>
                      Select one
                    </option>
                    {timelineOptions.map((timeline) => (
                      <option key={timeline} value={timeline}>
                        {timeline}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Budget range" name="budgetRange" required>
                  <select id="budgetRange" name="budgetRange" className={selectClasses()} defaultValue="" required>
                    <option value="" disabled>
                      Select one
                    </option>
                    {budgetOptions.map((budget) => (
                      <option key={budget} value={budget}>
                        {budget}
                      </option>
                    ))}
                  </select>
                </FormField>
              </FormRow>

              <FormField
                label="Project photos"
                name="photos"
                hint="Optional. Upload up to 8 photos to help us estimate faster."
              >
                <input id="photos" name="photos" type="file" accept="image/*" multiple className={inputClasses()} />
              </FormField>

              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-orange-400 bg-lime-400 px-5 py-3 text-base font-extrabold text-black transition hover:bg-lime-300"
              >
                Submit Project Request
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
