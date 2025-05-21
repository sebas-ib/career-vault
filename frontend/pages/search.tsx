import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios, { AxiosRequestConfig } from "axios";
import {ExternalLink, Pencil, Trash2} from "lucide-react";

interface Application {
  id: number;
  title: string;
  company: string;
  location: string;
  job_type: string;
  status: string;
  application_url: string;
  applied_at: string;
}

export default function SearchApplicationsPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [filtered, setFiltered] = useState<Application[]>([]);
  const [search, setSearch] = useState({
    title: "",
    company: "",
    location: "",
    job_type: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      axios
        .get("http://localhost:5000/api/applications", {
          headers: {
            "X-User-Email": session.user.email,
          },
        } as AxiosRequestConfig<any>)
        .then((res) => {
          setApplications(res.data);
          setFiltered(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, session]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedSearch = { ...search, [name]: value };
    setSearch(updatedSearch);
    applyFilter(updatedSearch);
  };

  const applyFilter = (criteria: typeof search, sourceList: Application[] = applications) => {
    const filteredData = sourceList.filter((app) => {
      return (
        app.title.toLowerCase().includes(criteria.title.toLowerCase()) &&
        app.company.toLowerCase().includes(criteria.company.toLowerCase()) &&
        app.location.toLowerCase().includes(criteria.location.toLowerCase()) &&
        (criteria.job_type ? app.job_type === criteria.job_type : true) &&
        (criteria.status ? app.status === criteria.status : true)
      );
    });
    setFiltered(filteredData);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await axios.patch(`http://localhost:5000/api/applications/${id}`, {
        status: newStatus,
      }, {
        headers: {
          "X-User-Email": session?.user?.email || "",
        },
      } as AxiosRequestConfig);
      setApplications(applications.map(app => app.id === id ? { ...app, status: newStatus } : app));
    } catch (error) {
      console.error("Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:5000/api/applications/${id}`, {
        headers: {
          "X-User-Email": session?.user?.email || "",
        },
      } as AxiosRequestConfig);

      const updated = applications.filter(app => app.id !== id);
      setApplications(updated);
      applyFilter(search, updated); // pass updated list to filter

    } catch (error) {
      console.error("Failed to delete application");
    }
  };


  if (status === "loading" || loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-100 p-8 md:ml-64 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search Applications</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            name="title"
            placeholder="Search by title"
            className="border p-2 rounded w-full"
            value={search.title}
            onChange={handleSearchChange}
          />
          <input
            type="text"
            name="company"
            placeholder="Search by company"
            className="border p-2 rounded w-full"
            value={search.company}
            onChange={handleSearchChange}
          />
          <input
            type="text"
            name="location"
            placeholder="Search by location"
            className="border p-2 rounded w-full"
            value={search.location}
            onChange={handleSearchChange}
          />
          <select
            name="job_type"
            className="border p-2 rounded w-full"
            value={search.job_type}
            onChange={handleSearchChange}
          >
            <option value="">All Job Types</option>
            <option value="Internship">Internship</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contract">Contract</option>
          </select>
          <select
            name="status"
            className="border p-2 rounded w-full"
            value={search.status}
            onChange={handleSearchChange}
          >
            <option value="">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <p className="text-gray-500">No applications match your search criteria.</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((app) => (
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
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => router.push(`/applications/edit/${app.id}`)}
                      className="text-sm text-yellow-600 hover:underline"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Applied: {new Date(app.applied_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
