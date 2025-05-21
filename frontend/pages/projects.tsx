// pages/projects.tsx
import {useSession, signOut} from "next-auth/react";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import axios from "axios";
import type {AxiosRequestConfig} from 'axios';


interface Project {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

export default function ProjectsPage() {
    const {status, data: session} = useSession();
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            fetchProjects(session.user.email);
        }
    }, [status, session]);

    const fetchProjects = async (email: string) => {
        try {
            const res = await axios.get("http://127.0.0.1:5000/api/projects", {
                headers: {"X-User-Email": email}
            } as AxiosRequestConfig);
            setProjects(res.data);
        } catch (err) {
            alert("Failed to load projects");
        }
    };

    const createProject = async () => {
        if (!newProjectName.trim()) return;
        setLoading(true);
        try {
            await axios.post("http://127.0.0.1:5000/api/projects",
                {
                    name: newProjectName,
                    description: newProjectDescription
                },
                {
                    headers: {"X-User-Email": session?.user?.email || ""}
                } as AxiosRequestConfig
            );
            setNewProjectName('');
            setNewProjectDescription('');
            fetchProjects(session?.user?.email || '');
        } catch {
            alert("Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-neutral-100 p-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">My Projects</h1>
                    <button onClick={() => signOut({callbackUrl: "/login"})}
                            className="text-sm text-gray-600 hover:text-black">
                        Log out
                    </button>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full text-gray-700 mb-2 p-3 border border-gray-300 rounded-lg"
                    />
                    <textarea
                        placeholder="Project description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg"
                        rows={3}
                    />
                    <button
                        onClick={createProject}
                        disabled={loading}
                        className="mt-3 w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Project"}
                    </button>
                </div>

                <div>
                    {projects.length === 0 ? (
                        <p className="text-gray-500 text-sm">No projects found.</p>
                    ) : (
                        <ul className="space-y-4">
                            {projects.map((project) => (
                                <li key={project.id} className="border p-4 rounded-lg shadow-sm">
                                    <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                                    <p className="text-gray-700 text-sm">{project.description}</p>
                                    <p className="text-gray-400 text-xs mt-1">
                                        Created at: {new Date(project.created_at).toLocaleString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
