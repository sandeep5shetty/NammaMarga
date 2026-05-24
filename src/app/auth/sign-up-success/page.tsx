import Link from "next/link";

const SignUpSuccessPage = () => {
  return (
    <div className="flex flex-col items-start gap-y-4 py-8 w-full px-0.5 max-w-md">
      <h2 className="text-2xl font-semibold">Check your email</h2>
      <p className="text-sm text-muted-foreground">
        We sent you a confirmation link. Click it to verify your account, then
        you&apos;ll be redirected to your dashboard.
      </p>
      <Link href="/auth/sign-in" className="text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
};

export default SignUpSuccessPage;
