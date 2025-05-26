import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios, { AxiosRequestConfig } from "axios";

interface Resume {
  id: string;
  filename: string;
  file_url: string;
  uploaded_at: string;
}

export default function EditJobPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { id } = router.query;

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && id) {
      // Fetch application data
      axios
        .get(`http://localhost:5000/api/applications/${id}`, {
          headers: {
            "X-User-Email": session.user.email,
          },
        } as AxiosRequestConfig)
        .then(res => {
          setFormData({
            ...res.data,
            company: res.data.company || res.data.company_name || "",
            resume_used: res.data.resume_used || "",
            application_method: res.data.application_method || "",
          });
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load application.");
          setLoading(false);
        });

      // Fetch resumes
      axios
        .get("http://localhost:5000/api/resumes", {
          headers: { "X-User-Email": session.user.email },
        } as AxiosRequestConfig)
        .then(res => setResumes(res.data))
        .catch(() => setError("Failed to load resumes."));
    }
  }, [status, session, id]);

  useEffect(() => {
    if (formData.resume_used && session?.user?.email) {
      axios
        .get(`http://localhost:5000/api/resumes/${formData.resume_used}/signed-url`, {
          headers: {
            "X-User-Email": session.user.email,
          },
        } as AxiosRequestConfig)
        .then(res => setResumePreviewUrl(res.data.signed_url))
        .catch(() => setResumePreviewUrl(null));
    }
  }, [formData.resume_used, session]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await axios.patch(
        `http://localhost:5000/api/applications/${id}`,
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
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-100 p-8 text-gray-800 md:ml-64">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-gray-200">
        <h1 className="text-xl font-bold mb-6 text-gray-900">Edit Job Application</h1>
        {error && <p className="mb-4 text-red-600">{error}</p>}
        <div className="grid gap-4">
          <label className="text-gray-800">Job Title</label>
          <input name="title" className="border p-3 rounded-lg w-full" value={formData.title} onChange={handleChange} />

          <label className="text-gray-800">Company Name</label>
          <input name="company" className="border p-3 rounded-lg w-full" value={formData.company} onChange={handleChange} />

          <label className="text-gray-800">Location</label>
          <input name="location" className="border p-3 rounded-lg w-full" value={formData.location} onChange={handleChange} />

          <label className="text-gray-800">Application URL</label>
          <input name="application_url" className="border p-3 rounded-lg w-full" value={formData.application_url} onChange={handleChange} />

          <label className="text-gray-800">Job Type</label>
          <select name="job_type" className="border p-3 rounded-lg w-full" value={formData.job_type} onChange={handleChange}>
            <option value="">Select Job Type</option>
            <option value="Internship">Internship</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contract">Contract</option>
          </select>

          <label className="text-gray-800">Resume Used</label>
          <select name="resume_used" className="border p-3 rounded-lg w-full" value={formData.resume_used} onChange={handleChange}>
            <option value="">Select a resume</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.filename}</option>
            ))}
          </select>

          {formData.resume_used && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Resume Preview:</p>
              {resumePreviewUrl ? (
                <iframe
                  src={resumePreviewUrl}
                  className="w-full h-64 border rounded"
                  title="Resume Preview"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="text-gray-500 text-sm">Unable to load preview.</p>
              )}
            </div>
          )}

          <label className="text-gray-800">Application Method</label>
          <input
            name="application_method"
            className="border p-3 rounded-lg w-full"
            placeholder="e.g. LinkedIn, Company Website"
            value={formData.application_method}
            onChange={handleChange}
          />

          <label className="text-gray-800">Description</label>
          <textarea name="description" rows={4} className="border p-3 rounded-lg w-full" value={formData.description} onChange={handleChange} />

          <label className="text-gray-800">Status</label>
          <select name="status" className="border p-3 rounded-lg w-full" value={formData.status} onChange={handleChange}>
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="mt-4 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
