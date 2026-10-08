import { Dashboard } from "@/components/Dashboard";
import { ensureSeeded } from "@/db/seed";
import { getDashboardSnapshot } from "@/runtime/parent";
import type { ComponentProps } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Home() {
  ensureSeeded();
  const initialData = getDashboardSnapshot() as ComponentProps<
    typeof Dashboard
  >["initialData"];
  return <Dashboard initialData={initialData} />;
}
