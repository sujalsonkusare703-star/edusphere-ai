import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowRight, Sparkles } from "@/components/icons";

interface ComingSoonProps {
  /** Section name, e.g. "Colleges". */
  title: string;
  /** Optional override for the one-line explanation. */
  message?: string;
}

const DEFAULT_MESSAGE =
  "We are building a verified database of Maharashtra colleges. This section is coming soon.";

/**
 * Placeholder page shown for every data section while NEXT_PUBLIC_DATA_LIVE is off.
 * Renders no data and triggers no data fetches. Pair it with
 * `comingSoonMetadata()` in the route so the page is marked noindex.
 */
export function ComingSoon({ title, message = DEFAULT_MESSAGE }: ComingSoonProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coming soon</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
            {title}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed">
            {message}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-sm transition"
            >
              <span>Back to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/profile"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200 transition"
            >
              Complete your profile
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
