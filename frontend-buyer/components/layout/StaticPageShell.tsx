import Link from 'next/link';

type StaticPageShellProps = {
  title: string;
  children: React.ReactNode;
};

export default function StaticPageShell({ title, children }: StaticPageShellProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
      <nav className="text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
        <Link href="/" className="text-[#0066CC] hover:underline">
          Home
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{title}</span>
      </nav>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-8">VistaExpress — optical solutions marketplace</p>
      <div className="text-gray-700 space-y-5 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}
