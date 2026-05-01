import { getServicePlanFormOptions, listServicePlans } from "@/lib/db/service-plans";

import { ServicePlansPageShell } from "./service-plans-page-shell";

export default async function ServicePlansPage() {
  const [plans, formOptions] = await Promise.all([listServicePlans(), getServicePlanFormOptions()]);

  const todayDate = new Date();
  const inThirtyDate = new Date(todayDate);
  inThirtyDate.setDate(inThirtyDate.getDate() + 30);

  const today = todayDate.toISOString().slice(0, 10);
  const inThirty = inThirtyDate.toISOString().slice(0, 10);

  return (
    <ServicePlansPageShell
      plans={plans}
      properties={formOptions.properties}
      serviceTypes={formOptions.serviceTypes}
      today={today}
      inThirty={inThirty}
    />
  );
}
