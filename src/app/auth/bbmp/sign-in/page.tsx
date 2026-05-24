import { AuthPageShell } from "@/components/auth/auth-page-shell";
import BbmpSignInForm from "@/components/auth/bbmp-signin-form";

export default function BbmpSignInPage() {
  return (
    <AuthPageShell
      footerText="Not a BBMP official?"
      footerLink={{ href: "/auth/sign-in", label: "Sign in to citizen portal" }}
    >
      <BbmpSignInForm />
    </AuthPageShell>
  );
}
