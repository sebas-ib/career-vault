import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import axios, {AxiosRequestConfig} from "axios";

interface Resume {
  id: string;
  filename: string;
  file_url: string;
  uploaded_at: string;
}



export default function ResumePage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  function ResumeViewer({ resume, session }: { resume: Resume; session: any }) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);

    useEffect(() => {
      const getSignedUrl = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/resumes/${resume.id}/signed-url`, {
            headers: {
              "X-User-Email": session?.user?.email || "",
            },
          } as AxiosRequestConfig);
          setSignedUrl(res.data.signed_url);
        } catch (err) {
          console.error("Failed to get signed URL", err);
        }
      };

      getSignedUrl();
    }, [resume.id, session?.user?.email]);


    const handleDelete = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

      try {
        await axios.delete(`http://localhost:5000/api/resumes/${resumeId}`, {
          headers: {
            "X-User-Email": session?.user?.email || "",
          },
        } as AxiosRequestConfig);
        fetchResumes(); // refresh the list
      } catch (err) {
        console.error("Failed to delete resume", err);
        setError("Failed to delete resume.");
      }
    };

    if (!signedUrl) return <p className="text-sm text-gray-500">Loading PDF preview...</p>;

    return (
      <div>
        <iframe
          src={signedUrl}
          className="w-full h-64 border rounded"
          title={resume.filename}
          referrerPolicy="no-referrer"
        />
        <button
          onClick={() => handleDelete(resume.id)}
          className="mt-2 text-sm text-red-600 hover:underline"
        >
          Delete Resume
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchResumes();
    }
  }, [status, session]);

  const fetchResumes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/resumes", {
        headers: { "X-User-Email": session?.user?.email || "" },
      } as AxiosRequestConfig);
      setResumes(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load resumes.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setError(null);

    try {
      await axios.post("http://localhost:5000/api/resumes", formData, {
        headers: {
          "X-User-Email": session?.user?.email || "", },
      } as AxiosRequestConfig);
      fetchResumes();
    } catch (err) {
      console.error(err);
      setError("Failed to upload resume.");
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading") return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-100 p-6 md:ml-64">
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">My Resumes</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="mb-6">
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload PDF Resume"}
          </button>
        </div>

        {resumes.length === 0 ? (
          <p className="text-gray-500">No resumes uploaded yet.</p>
        ) : (
          <div className="grid gap-6">
            {resumes.map((resume) => (
              <div key={resume.id} className="border p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium text-gray-800">{resume.filename}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded: {new Date(resume.uploaded_at).toLocaleString()}
                  </p>
                </div>
                <ResumeViewer resume={resume} session={session} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
