import {useSession, signIn} from 'next-auth/react';
import {useEffect} from 'react';
import {useRouter} from 'next/router';
import axios from 'axios';

export default function LoginPage() {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
    const {status, data: session} = useSession();
    const router = useRouter();

    useEffect(() => {
        console.log("Session status:", status);
        console.log("Session data:", session);
    }, [status, session]);

    useEffect(() => {
        const handleLogin = async () => {
            if (status === 'authenticated' && session?.user) {
                try {
                    console.log("Sending token to backend:", session.idToken);

                    // Call backend to verify and create user
                    await axios.post(`${API_BASE_URL}/api/verify-google-token`, {
                        token: session.idToken,
                    });

                    router.push('/'); // Redirect after login
                } catch (err) {
                    console.error("Login setup failed", err);
                }
            }
        };

        handleLogin();
    }, [status, session, router, API_BASE_URL]);

    return (
        <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-neutral-100">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md border border-gray-200 shadow-sm text-center">
                <h1 className="text-3xl font-semibold mb-6 text-gray-900">Login</h1>
                <button
                    onClick={() => signIn('google')}
                    className="bg-black text-white px-6 py-3 rounded-xl text-lg hover:bg-gray-800 transition"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
