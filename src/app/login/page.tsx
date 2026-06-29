import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
}) {
  const params = await searchParams;
  const initialError = params.error ? decodeURIComponent(params.error) : undefined;
  const nextPath =
    params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const initialEmail = params.email ? decodeURIComponent(params.email) : undefined;

  return (
    <LoginForm initialError={initialError} nextPath={nextPath} initialEmail={initialEmail} />
  );
}
