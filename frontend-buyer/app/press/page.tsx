import type { Metadata } from 'next';
import StaticPageShell from '@/components/layout/StaticPageShell';

export const metadata: Metadata = {
  title: 'Press & Media | Vista Express',
  description: 'Press releases and media resources for Vista Express.',
};

export default function PressPage() {
  return (
    <StaticPageShell title="Press Releases">
      <p>
        Welcome to the Vista Express press area. Here you will find announcements about our marketplace,
        partnerships, and product news.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Media inquiries</h2>
      <p>
        Journalists and content creators can reach our communications team at{' '}
        <a href="mailto:press@vistaexpress.com" className="text-[#0066CC] hover:underline">
          press@vistaexpress.com
        </a>
        . Please include your outlet, deadline, and topic.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Brand</h2>
      <p>
        Vista Express and related logos are trademarks of Vista Express. For approved logo and brand
        assets, request them by email to the press address above.
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">Recent highlights</h2>
      <p>
        News items and downloadable materials will be listed here as they are published. Check back
        periodically or subscribe to updates via our press contact.
      </p>
    </StaticPageShell>
  );
}
