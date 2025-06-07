import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';


export default function Home() {

    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/applicationspage');
        }
    }, [status, router]);

    return (
        <>
            <Head>
                <title>CareerVault</title>
                <meta name="description" content="CareerVault helps you track job applications, manage resumes, and organize your job search efficiently." />
                <meta name="robots" content="index, follow" />
            </Head>

            <div className="min-h-screen bg-gradient-to-b from-white via-neutral-100 to-white flex flex-col items-center justify-center p-8">
                <div className="max-w-4xl text-center">
                    <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                        Welcome to <span className="text-blue-600">CareerVault</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Track your job applications, manage resumes, and stay organized in your job search journey.
                    </p>

                    <div className="flex justify-center gap-4 mb-12 flex-wrap">
                        <Link href="/login">
                            <button className="px-8 py-3 bg-blue-600 text-white text-lg rounded-xl hover:bg-blue-700 transition shadow-md">
                                Log In to Your Vault
                            </button>
                        </Link>
                    </div>
                </div>

                <div id="features" className=" max-w-6xl w-full">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Features</h2>
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3 px-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition text-center">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Track Applications</h3>
                            <p className="text-gray-500 text-sm">
                                Easily record and manage the jobs you’ve applied to.
                            </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition text-center">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Manage Resumes</h3>
                            <p className="text-gray-500 text-sm">
                                Upload and organize different versions of your resumes.
                            </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition text-center">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Stay Organized</h3>
                            <p className="text-gray-500 text-sm">
                                Visualize your progress and stay on top of your job search.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
