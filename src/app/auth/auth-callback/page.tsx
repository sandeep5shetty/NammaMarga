import { Suspense } from "react";
import { AuthCallbackClient, AuthCallbackFallback } from "./auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
