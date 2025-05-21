import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  FilePlus,
  Briefcase,
  Clock,
  BarChart3,
} from "lucide-react";
import type { ReactElement } from "react";

export default function Home() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  if (status === "loading") return <div className="p-4 text-center">Loading...</div>;
  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-gray-50 md:ml-64">
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome, {session?.user?.name?.split(" ")[0]}!</h1>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            <DashboardCard href="/applications" label="My Applications" icon={<ClipboardList className="w-6 h-6 text-blue-700" />} />
            <DashboardCard href="/add" label="Add New Job" icon={<FilePlus className="w-6 h-6 text-green-600" />} />
            <DashboardCard href="/activity" label="Recent Activity" icon={<Clock className="w-6 h-6 text-orange-600" />} />
            <DashboardCard href="/insights" label="Analytics & Insights" icon={<BarChart3 className="w-6 h-6 text-emerald-700" />} />
            <DashboardCard href="/resume" label="Manage Resumes" icon={<Briefcase className="w-6 h-6 text-purple-700" />} />
          </div>
        </section>
      </main>
    </div>
  );
}

function DashboardCard({ href, label, icon }: { href: string; label: string; icon: ReactElement }) {
  return (
    <Link
      href={href}
      className="bg-white hover:shadow-md p-5 rounded-xl border border-gray-200 flex items-centcon: ReactElementer gap-4 transition group"
    >
      <div className="group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </Link>
  );
}

function SidebarLink({ href, label, icon }: { href: string; label: string; icon: ReactElement }) {
  return (
    <Link href={href} className="flex items-center gap-3 text-gray-700 hover:text-black transition">
      {icon}
      <span>{label}</span>
    </Link>
  );
}
