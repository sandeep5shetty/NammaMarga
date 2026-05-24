import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignUpForm } from "@/components";

const SignUpPage = () => {
    return (
        <AuthPageShell
            footerText="Already have an account?"
            footerLink={{ href: "/auth/sign-in", label: "Sign in" }}
        >
            <SignUpForm />
        </AuthPageShell>
    );
};

export default SignUpPage;
