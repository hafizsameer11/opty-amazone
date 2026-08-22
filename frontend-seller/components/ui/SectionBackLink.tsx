import Link from "next/link";

export type SectionBackLinkProps = {
  href: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Link back to a section parent (e.g. Store Management). Prefer over router.back()
 * so navigation is correct when the user opened the page in a new tab or from outside the app.
 */
export default function SectionBackLink({
  href,
  children = "Back",
  className = "",
}: SectionBackLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-[#0066CC] hover:text-[#0052a3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066CC] focus-visible:ring-offset-2 rounded ${className}`}
    >
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {children}
    </Link>
  );
}
