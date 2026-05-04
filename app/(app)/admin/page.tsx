import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminTabs from "./AdminTabs";
import MetricsSection from "./MetricsSection";
import DailyVideoSection from "./DailyVideoSection";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/main");

  return (
    <div className="px-5 py-5 space-y-6">
      {/* 헤더 */}
      <div>
        <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
          Admin Dashboard
        </div>
        <h2 className="mt-1 text-[28px] leading-[1.1] font-heading font-bold text-brown-dark">
          관리자
        </h2>
      </div>

      <AdminTabs
        metrics={<MetricsSection />}
        video={<DailyVideoSection />}
      />
    </div>
  );
}
