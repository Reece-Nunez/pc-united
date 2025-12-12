import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNewsBySlug, News } from '@/lib/supabase';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: article } = await getNewsBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found | Ponca City United FC',
    };
  }

  return {
    title: `${article.title} | Ponca City United FC`,
    description: article.excerpt || `Read ${article.title} on Ponca City United FC`,
    openGraph: {
      title: article.title,
      description: article.excerpt || `Read ${article.title} on Ponca City United FC`,
      images: article.featured_image ? [article.featured_image] : [],
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const { data: article, error } = await getNewsBySlug(slug);

  if (error || !article) {
    notFound();
  }

  // Parse date as local time
  const parseAsLocalTime = (utcDateString: string): Date => {
    const dateStr = utcDateString.replace(/[+-]\d{2}:?\d{0,2}$|Z$/g, '');
    return new Date(dateStr);
  };

  const publishDate = article.publish_date
    ? parseAsLocalTime(article.publish_date)
    : null;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section with Featured Image */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white">
        {article.featured_image && (
          <div className="absolute inset-0 opacity-30">
            <Image
              src={article.featured_image}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <Link
            href="/team"
            className="inline-flex items-center text-blue-200 hover:text-white mb-6 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Team News
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-blue-100">
            {article.author && (
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {article.author}
              </span>
            )}
            {publishDate && (
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {publishDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {article.featured_image && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
            <Image
              src={article.featured_image}
              alt={article.title}
              width={1200}
              height={630}
              className="w-full h-auto"
              priority
            />
          </div>
        )}

        {article.excerpt && (
          <p className="text-xl text-gray-600 mb-8 font-medium leading-relaxed border-l-4 border-team-blue pl-4">
            {article.excerpt}
          </p>
        )}

        <div className="prose prose-lg max-w-none prose-headings:text-team-blue prose-a:text-team-blue">
          {article.content.split('\n').map((paragraph: string, index: number) => (
            paragraph.trim() && (
              <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            )
          ))}
        </div>
      </article>

      {/* Back to News */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/team"
            className="inline-flex items-center justify-center px-6 py-3 bg-team-blue text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Team News
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
