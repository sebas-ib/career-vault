import {useSession} from "next-auth/react";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import axios, {AxiosRequestConfig} from "axios";
import {ExternalLink, Pencil, Trash2} from "lucide-react";

interface Application {
    id: number;
    title: string;
    company: string;
    job_type: string;
    location: string;
    application_url: string;
    status: string;
    applied_at: string;
}

export default function ApplicationsPage() {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const {status, data: session} = useSession();
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            axios
                .get(`${API_BASE_URL}/api/applications`, {
                    headers: {
                        "X-User-Email": session.user.email,
                    },
                } as AxiosRequestConfig)
                .then(res => {
                    setApplications(res.data);
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                });
        }
    }, [status, session, API_BASE_URL]);

    const handleStatusChange = async (id: number, newStatus: string) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/applications/${id}`, {
                status: newStatus,
            }, {
                headers: {
                    "X-User-Email": session?.user?.email || "",
                },
            } as AxiosRequestConfig);
            setApplications(applications.map(app => app.id === id ? {...app, status: newStatus} : app));
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/applications/${id}`, {
                headers: {
                    "X-User-Email": session?.user?.email || "",
                },
            } as AxiosRequestConfig);
            setApplications(applications.filter(app => app.id !== id));
        } catch (error) {
            console.error("Failed to delete application", error);
        }
    };

    const grouped = {
        Offer: [] as Application[],
        Interview: [] as Application[],
        Applied: [] as Application[],
        Rejected: [] as Application[],
    };

    applications.forEach(app => {
        grouped[app.status as keyof typeof grouped]?.push(app);
    });

    if (status === "loading" || loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 md:ml-64">
            <div className="max-w-6xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        My Vault
                    </h1>
                    <p className="text-gray-500 mt-2">Track and manage job applications here!</p>
                </div>

                {Object.entries(grouped).map(([statusKey, apps]) => (
                    <div key={statusKey} className="mb-10">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-1">{statusKey}</h2>
                        {apps.length === 0 ? (
                            <div className="text-gray-500 text-sm italic">No {statusKey.toLowerCase()} applications
                                yet.</div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2">
                                {apps.map(app => (
                                    <div key={app.id}
                                         className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{app.title}</h3>
                                                <p className="text-sm text-gray-600">{app.company} • {app.location}</p>
                                                <div className="mt-2">
                                                    <label className="text-sm text-gray-500 mr-2">Status:</label>
                                                    <select
                                                        value={app.status}
                                                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                                        className="border rounded px-2 py-1 text-sm text-gray-500"
                                                    >
                                                        <option value="Applied">Applied</option>
                                                        <option value="Interview">Interview</option>
                                                        <option value="Offer">Offer</option>
                                                        <option value="Rejected">Rejected</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <a
                                                    href={app.application_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                                                >
                                                    <ExternalLink size={14}/>
                                                </a>
                                                <button
                                                    onClick={() => router.push(`/applications/edit/${app.id}`)}
                                                    className="text-yellow-600 text-sm hover:underline flex items-center gap-1"
                                                >
                                                    <Pencil size={14}/>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(app.id)}
                                                    className="text-red-600 text-sm hover:underline flex items-center gap-1"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-4">Applied
                                            on: {new Date(app.applied_at).toLocaleString(undefined, {
                                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                                timeZoneName: "short",
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
