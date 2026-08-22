'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productService, type Category } from '@/services/product-service';
import { useLanguage } from '@/contexts/LanguageContext';
import { categoryDisplayName } from '@/lib/category-i18n';
import CategoryTile from '@/components/categories/CategoryTile';

export default function CategoriesIndexPage() {
  const { language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await productService.getCategories(true);
        setCategories((data || []).filter((c: Category) => c.slug !== 'opty-kids'));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
      <p className="text-gray-600 mb-8">Browse all Vista Express categories and subcategories.</p>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((cat, index) => (
              <CategoryTile
                key={cat.id}
                category={cat}
                label={categoryDisplayName(cat, language)}
                index={index}
                size="lg"
              />
            ))}
          </div>

          <div className="space-y-8">
            {categories.map((cat) => (
              <section key={`detail-${cat.id}`} className="border border-gray-200 rounded-2xl bg-white p-6">
                <Link href={`/categories/${cat.slug}`} className="text-xl font-semibold text-[#0066CC] hover:underline">
                  {categoryDisplayName(cat, language)}
                </Link>
                {cat.children && cat.children.length > 0 && (
                  <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/categories/${child.slug}`}
                          className="block rounded-lg border border-gray-100 px-4 py-3 hover:border-[#0066CC]/40 hover:bg-[#0066CC]/5 transition-colors"
                        >
                          <span className="font-medium text-gray-900">{categoryDisplayName(child, language)}</span>
                          {child.children && child.children.length > 0 && (
                            <ul className="mt-2 ml-2 space-y-1">
                              {child.children.map((g) => (
                                <li key={g.id}>
                                  <Link href={`/categories/${g.slug}`} className="text-sm text-gray-600 hover:text-[#0066CC]">
                                    {categoryDisplayName(g, language)}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
