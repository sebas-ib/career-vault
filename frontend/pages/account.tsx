import {useSession, signOut} from "next-auth/react";
import {useRouter} from "next/router";
import {useEffect} from "react";
import Link from "next/link";
import Image from "next/image";

export default function AccountPage() {
    const {status, data: session} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") return <div className="p-4 text-center">Loading...</div>;
    if (status === "unauthenticated") return null;

    const user = session?.user;

    return (
        <div
            className="max-h-screen bg-neutral-100 flex items-center justify-center px-4 md:ml-64 overflow-x-hidden py-50">
            <div className="bg-white p-8 rounded-xl border border-gray-200 w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">My Account</h1>

                <div className="flex flex-col items-center gap-4">
                    {user?.image && (
                        <Image
                            src={user.image}
                            alt="Profile"
                            width={96}
                            height={96}
                            className="rounded-full border object-cover"
                            referrerPolicy="no-referrer"
                        />
                    )}

                    <div className="text-center">
                        <p className="text-lg font-medium text-gray-800">{user?.name || "No Name Provided"}</p>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>

                    <div className="w-full mt-6 space-y-3">
                        <Link
                            href="/frontend/pages/applicationspage"
                            className="block text-center w-full py-2 rounded-lg bg-white text-black hover:bg-gray-100 transition font-medium"
                        >
                            Back to Dashboard
                        </Link>
                        <button
                            onClick={() => signOut({callbackUrl: "/login"})}
                            className="w-full py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition font-medium"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
