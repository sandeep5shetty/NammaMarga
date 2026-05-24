import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components";

const SignInPage = () => {
    return (
        <AuthPageShell
            footerText="Don't have an account?"
            footerLink={{ href: "/auth/sign-up", label: "Sign up" }}
        >
            <SignInForm />
        </AuthPageShell>
    );
};

export default SignInPage;
