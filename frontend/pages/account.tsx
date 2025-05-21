import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";

export default function AccountPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  if (status === "loading") return <div className="p-4 text-center">Loading...</div>;
  if (status === "unauthenticated") return null;

  const { user } = session;

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-4 md:ml-64">
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">My Account</h1>

        <div className="flex flex-col items-center gap-4">
          {user?.image && (
            <img
              src={user.image}
              alt="Profile"
              className="w-24 h-24 rounded-full border object-cover"
            />
          )}

          <div className="text-center">
            <p className="text-lg font-medium text-gray-800">{user?.name || "No Name Provided"}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>

          <div className="w-full mt-6 space-y-3">
            <Link
              href="/"
              className="block text-center w-full py-2 rounded-lg bg-blue-100 text-blue-900 hover:bg-blue-200 transition font-medium"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition font-medium"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
