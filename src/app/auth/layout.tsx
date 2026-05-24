import React from "react";

interface Props {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: Props) {
    return (
        <main className="min-h-screen bg-background transition-colors duration-300">
            {children}
        </main>
    );
}
