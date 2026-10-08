import { Dashboard } from "@/components/Dashboard";
import { ensureSeeded } from "@/db/seed";
import { getDashboardSnapshot } from "@/runtime/parent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Home() {
  ensureSeeded();
  const initialData = getDashboardSnapshot();
  return <Dashboard initialData={initialData} />;
}
