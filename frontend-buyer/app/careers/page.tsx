import type { Metadata } from 'next';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Careers | Vista Express',
  description: 'Join Vista Express and help build the future of optical e-commerce.',
};

export default function CareersPage() {
  return (
    <StaticPageShell title="Careers">
      <p>
        Vista Express is growing. We are building technology, operations, and partnerships that help
        customers and sellers succeed in optical retail online.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Open roles</h2>
      <p>
        We post openings as they become available. If you are passionate about e-commerce, optics,
        customer experience, or marketplace technology, we would like to hear from you.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Apply</h2>
      <p>
        Send your CV and a short introduction to{' '}
        <a href="mailto:careers@vistaexpress.com" className="text-[#0066CC] hover:underline">
          careers@vistaexpress.com
        </a>
        . Please include the type of role you are interested in (e.g. engineering, operations, support).
      </p>
      <p className="text-sm text-gray-500">
        Vista Express is an equal opportunity employer. We welcome applicants from all backgrounds.
      </p>
    </StaticPageShell>
  );
}
