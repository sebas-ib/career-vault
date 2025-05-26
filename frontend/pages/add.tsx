import {useSession} from "next-auth/react";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import axios, {AxiosRequestConfig} from "axios";

interface Resume {
    id: string;
    filename: string;
    file_url: string;
    uploaded_at: string;
}

export default function AddJobPage() {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const {status, data: session} = useSession();
    const router = useRouter();

    const [url, setUrl] = useState("");
    const [step, setStep] = useState<"paste" | "form">("paste");
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        company: "",
        job_type: "",
        location: "",
        application_url: "",
        description: "",
        status: "Applied",
        resume_used: "",
        application_method: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            axios
                .get(`${API_BASE_URL}/api/resumes`, {
                    headers: {"X-User-Email": session.user.email},
                } as AxiosRequestConfig)
                .then((res) => setResumes(res.data))
                .catch((err) => console.error("Failed to fetch resumes", err));
        }
    }, [status, session, API_BASE_URL]);

    useEffect(() => {
        if (formData.resume_used && session?.user?.email) {
            axios
                .get(`${API_BASE_URL}/api/resumes/${formData.resume_used}/signed-url`, {
                    headers: {"X-User-Email": session.user.email},
                } as AxiosRequestConfig)
                .then((res) => setResumePreviewUrl(res.data.signed_url))
                .catch(() => setResumePreviewUrl(null));
        } else {
            setResumePreviewUrl(null);
        }
    }, [formData.resume_used, session, API_BASE_URL]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await axios.post(
                `${API_BASE_URL}/api/applications`,
                {
                    ...formData,
                    company_name: formData.company,
                    resume_used: formData.resume_used || null,
                },
                {
                    headers: {
                        "X-User-Email": session?.user?.email || "",
                    },
                } as AxiosRequestConfig
            );
            router.push("/");
        } catch (err) {
            console.error(err);
            setError("Failed to add job. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleParseUrl = async () => {
        if (!url.trim()) return;
        setParsing(true);
        setError(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/parse-url`, {url});
            setFormData({
                ...formData,
                ...res.data,
                company: res.data.company || "",
                application_url: url,
                status: "Applied",
            });
            setStep("form");
        } catch {
            setError("Failed to parse the job URL.");
        } finally {
            setParsing(false);
        }
    };

    if (status === "loading") return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-neutral-100 p-8 text-gray-800 md:ml-64">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-gray-200">
                <h1 className="text-xl font-bold mb-6 text-gray-900">Add New Job Application</h1>
                {error && <p className="mb-4 text-red-600">{error}</p>}

                {step === "paste" ? (
                    <>
                        <input
                            type="text"
                            placeholder="Paste job application URL"
                            className="border p-3 rounded-lg w-full mb-4"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={handleParseUrl}
                                disabled={parsing}
                                className="bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                            >
                                {parsing ? "Parsing..." : "Auto-Fill from URL"}
                            </button>
                            <button
                                onClick={() => setStep("form")}
                                className="bg-white text-black hover:bg-gray-100 transition py-2 px-4 rounded-lg"
                            >
                                Enter Info Manually
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="grid gap-4">
                        <label>Job Title</label>
                        <input name="title" className="border p-3 rounded-lg w-full" value={formData.title}
                               onChange={handleChange}/>

                        <label>Company Name</label>
                        <input name="company" className="border p-3 rounded-lg w-full" value={formData.company}
                               onChange={handleChange}/>

                        <label>Location</label>
                        <input name="location" className="border p-3 rounded-lg w-full" value={formData.location}
                               onChange={handleChange}/>

                        <label>Application URL</label>
                        <input name="application_url" className="border p-3 rounded-lg w-full"
                               value={formData.application_url} onChange={handleChange}/>

                        <label>Job Type</label>
                        <select name="job_type" className="border p-3 rounded-lg w-full" value={formData.job_type}
                                onChange={handleChange}>
                            <option value="">Select Job Type</option>
                            <option value="Internship">Internship</option>
                            <option value="Full-Time">Full-Time</option>
                            <option value="Part-Time">Part-Time</option>
                            <option value="Contract">Contract</option>
                        </select>

                        <label>Resume Used</label>
                        <select name="resume_used" className="border p-3 rounded-lg w-full" value={formData.resume_used}
                                onChange={handleChange}>
                            <option value="">Select a resume</option>
                            {resumes.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.filename}
                                </option>
                            ))}
                        </select>

                        {formData.resume_used && (
                            <div>
                                <p className="text-sm text-gray-600 mt-1 mb-2">Resume Preview:</p>
                                {resumePreviewUrl ? (
                                    <iframe
                                        src={resumePreviewUrl}
                                        className="w-full h-64 border rounded"
                                        title="Resume Preview"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <p className="text-gray-500 text-sm">Loading preview...</p>
                                )}
                            </div>
                        )}

                        <label>Application Method</label>
                        <input
                            name="application_method"
                            className="border p-3 rounded-lg w-full"
                            placeholder="e.g. LinkedIn, Company Website"
                            value={formData.application_method}
                            onChange={handleChange}
                        />

                        <label>Description</label>
                        <textarea
                            name="description"
                            rows={4}
                            className="border p-3 rounded-lg w-full"
                            value={formData.description}
                            onChange={handleChange}
                        />

                        <label>Status</label>
                        <select name="status" className="border p-3 rounded-lg w-full" value={formData.status}
                                onChange={handleChange}>
                            <option value="Applied">Applied</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Offer</option>
                            <option value="Rejected">Rejected</option>
                        </select>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="mt-4 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                            {submitting ? "Adding..." : "Add to Vault"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
