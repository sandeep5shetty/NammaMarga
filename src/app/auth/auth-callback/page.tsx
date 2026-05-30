"use client";

import { getAuthStatus } from "@/actions";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

const AuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data } = useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => await getAuthStatus(),
    retry: true,
    retryDelay: 500,
  });

  useEffect(() => {
    if (data?.success) {
      router.push(safeNextPath(searchParams.get("next")));
    } else if (data?.error) {
      const next = searchParams.get("next");
      const signInUrl = next
        ? `/auth/sign-in?next=${encodeURIComponent(next)}`
        : "/auth/sign-in";
      router.push(signInUrl);
    }
  }, [data, router, searchParams]);

  return (
    <div className="flex items-center justify-center flex-col h-screen relative">
      <div className="border-[3px] border-neutral-800 rounded-full border-b-neutral-200 animate-loading w-8 h-8"></div>
      <p className="text-lg font-medium text-center mt-3">
        Verifying your account...
      </p>
    </div>
  );
};

export default AuthCallbackPage;
