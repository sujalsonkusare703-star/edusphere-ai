import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SoonBadge } from "@/components/SoonBadge";

const FOOTER_LINKS = [
  { href: "/colleges", label: "Colleges" },
  { href: "/internships", label: "Internships" },
  { href: "/placements", label: "Placements" },
  { href: "/recommendations", label: "AI Recommendations" },
];

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-neutral-200/80 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center">
          <Logo variant="full" size="sm" />
        </div>

        <p className="text-xs text-neutral-400 text-center">
          &copy; {new Date().getFullYear()} EduSphere AI. Shape Your Future. AI Guides You Forward.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-neutral-600">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 hover:text-neutral-950 transition-colors"
            >
              {link.label}
              <SoonBadge />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
