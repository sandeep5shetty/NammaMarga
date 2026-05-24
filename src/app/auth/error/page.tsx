import Link from "next/link";

const AuthErrorPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) => {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col items-start gap-y-4 py-8 w-full px-0.5 max-w-md">
      <h2 className="text-2xl font-semibold">Authentication error</h2>
      <p className="text-sm text-muted-foreground">
        {error ?? "Something went wrong during authentication."}
      </p>
      <Link href="/auth/sign-in" className="text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
};

export default AuthErrorPage;
