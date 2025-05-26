import {useSession} from "next-auth/react";
import Link from "next/link";
import {useState} from "react";
import Image from "next/image";
import {
    Menu,
    X,
    ClipboardList,
    FilePlus,
    Briefcase,
    Clock,
    BarChart3,
    Search,
} from "lucide-react";

export default function Navbar() {
    const {data: session} = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            {/* Top Navbar */}
            <nav
                className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden text-gray-600 hover:text-black"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
                    </button>

                    <div className="flex-direction: column">
                        <Link href="/" className="text-2xl font-bold text-gray-800">
                            CareerVault
                        </Link>
                        <p className="text-sm text-gray-400">
                            Welcome, {session?.user?.name?.split(" ")[0]}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {session?.user?.image && (
                        <Link href="/account">
                            <Image
                                src={session.user.image}
                                alt="Profile"
                                width={32}
                                height={32}
                                className="rounded-full hover:ring-2 hover:ring-gray-300 hover:ring-offset-2"
                                referrerPolicy="no-referrer"
                            />
                        </Link>
                    )}
                </div>
            </nav>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}
            >
                <div className="p-6">
                    {session?.user && (
                        <div className="mb-6">
                            <div className="flex items-center gap-3">
                                {session.user.image && (
                                    <Image
                                        src={session.user.image}
                                        alt="Avatar"
                                        width={40}
                                        height={40}
                                        className="rounded-full object-cover border"
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {session.user.name?.split(" ")[0]}
                                    </p>
                                    <p className="text-xs text-gray-500">{session.user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2 pt-5">Navigation</p>
                            <nav className="flex flex-col gap-2 text-sm">
                                <SidebarLink onClick={() => setIsSidebarOpen(false)} href="/"
                                             icon={<ClipboardList className="w-5 h-5"/>}>
                                    My Vault
                                </SidebarLink>
                                <SidebarLink onClick={() => setIsSidebarOpen(false)} href="/add"
                                             icon={<FilePlus className="w-5 h-5"/>}>
                                    Add New Job
                                </SidebarLink>
                                <SidebarLink onClick={() => setIsSidebarOpen(false)} href="/activity"
                                             icon={<Clock className="w-5 h-5"/>}>
                                    Recently Applied
                                </SidebarLink>
                                <SidebarLink onClick={() => setIsSidebarOpen(false)} href="/insights"
                                             icon={<BarChart3 className="w-5 h-5"/>}>
                                    Analytics & Insights
                                </SidebarLink>
                                <SidebarLink onClick={() => setIsSidebarOpen(false)} href="/resume"
                                             icon={<Briefcase className="w-5 h-5"/>}>
                                    Manage Resumes
                                </SidebarLink>
                                <SidebarLink onClick={() => setIsSidebarOpen(false)} href="/search"
                                             icon={<Search className="w-5 h-5"/>}>
                                    Search Your Vault
                                </SidebarLink>
                            </nav>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

function SidebarLink({
                         href,
                         icon,
                         children,
                         onClick,
                     }: {
    href: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 text-gray-700 hover:text-black transition px-3 py-2 rounded-md hover:bg-gray-100"
        >

            {icon}
            <span>{children}</span>
        </Link>
    );
}
