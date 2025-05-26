import "@/styles/globals.css";
import {SessionProvider, useSession} from "next-auth/react";
import type {AppProps} from "next/app";
import Navbar from "@/pages/components/Navbar";

function LayoutWithAuth({children}: { children: React.ReactNode }) {
    const {status} = useSession();

    return (
        <>
            {status === "authenticated" && <Navbar/>}
            <main>{children}</main>
        </>
    );
}

export default function App({Component, pageProps: {session, ...pageProps}}: AppProps) {
    return (
        <SessionProvider session={session}>
            <div className="min-h-screen bg-neutral-100">
                <LayoutWithAuth>
                    <Component {...pageProps} />
                </LayoutWithAuth>
            </div>
        </SessionProvider>
    );
}
