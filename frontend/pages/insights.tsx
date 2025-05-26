import {useSession} from "next-auth/react";
import {useRouter} from "next/router";
import React, {useEffect, useState, useCallback} from "react";
import axios, {AxiosRequestConfig} from "axios";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";

interface Application {
    id: string;
    job_type: string;
    status: string;
}

export default function InsightsPage() {
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

    const fetchApplications = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/applications`, {
                headers: {
                    "X-User-Email": session?.user?.email || "",
                },
            } as AxiosRequestConfig);
            setApplications(res.data);
        } catch (err) {
            console.error("Failed to fetch applications", err);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.email, API_BASE_URL]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            fetchApplications();
        }
    }, [status, session, fetchApplications]);

    const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
    }, {});

    const jobTypeCounts = applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.job_type || "Unknown"] = (acc[app.job_type || "Unknown"] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status,
        value: count,
    }));

    const barData = Object.entries(jobTypeCounts).map(([type, count]) => ({
        jobType: type,
        count,
    }));

    const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

    if (loading) return <div className="p-4 text-center">Loading analytics...</div>;

    return (
        <div className="min-h-screen bg-neutral-100 p-6 md:ml-64">
            <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Application Insights</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Pie chart */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Status Distribution</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bar chart */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Job Types</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barData}>
                                <XAxis dataKey="jobType"/>
                                <YAxis allowDecimals={false}/>
                                <Tooltip/>
                                <Bar dataKey="count" fill="#4F46E5"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                    <Stat label="Total" value={applications.length}/>
                    <Stat label="Applied" value={statusCounts["Applied"] || 0}/>
                    <Stat label="Interview" value={statusCounts["Interview"] || 0}/>
                    <Stat label="Offer" value={statusCounts["Offer"] || 0}/>
                    <Stat label="Rejected" value={statusCounts["Rejected"] || 0}/>
                </div>
            </div>
        </div>
    );
}

function Stat({label, value}: { label: string; value: number }) {
    return (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
}
