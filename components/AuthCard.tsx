import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Centered card layout shared by the password reset pages (matches the login page). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white text-neutral-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center mb-6 transition-opacity hover:opacity-90">
          <Logo variant="full" size="lg" priority />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-neutral-200/90 rounded-3xl p-6 sm:p-9 shadow-xl shadow-neutral-900/5">
          {children}
        </div>
        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs font-medium text-neutral-400 hover:text-neutral-700 transition">
            &larr; Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
