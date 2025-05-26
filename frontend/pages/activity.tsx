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

export default function ActivityPage() {
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
                    const sortedApps = res.data.sort((a: Application, b: Application) =>
                        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
                    );
                    setApplications(sortedApps);
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

    if (status === "loading" || loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 md:ml-64">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Recently Applied</h1>
                {applications.length === 0 ? (
                    <p className="text-gray-500">No applications yet.</p>
                ) : (
                    <div className="grid gap-4">
                        {applications.map(app => (
                            <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">{app.title}</h2>
                                        <p className="text-sm text-gray-600">{app.company} – {app.location}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Status:
                                            <select
                                                value={app.status}
                                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                                className="ml-2 border rounded px-2 py-1 text-sm"
                                            >
                                                <option value="Applied">Applied</option>
                                                <option value="Interview">Interview</option>
                                                <option value="Offer">Offer</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <a
                                            href={app.application_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            <ExternalLink size={14}/>
                                        </a>
                                        <button
                                            onClick={() => router.push(`/applications/edit/${app.id}`)}
                                            className="text-sm text-yellow-600 hover:underline"
                                        >
                                            <Pencil size={14}/>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(app.id)}
                                            className="text-sm text-red-600 hover:underline"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Applied: {new Date(app.applied_at).toLocaleString(undefined, {
                                    timeZoneName: "short",
                                })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
