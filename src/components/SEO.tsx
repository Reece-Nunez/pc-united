import { Metadata } from 'next';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

// Base SEO configuration
const defaultSEO = {
  title: 'Ponca City United FC - Youth Soccer Club in Ponca City, Oklahoma',
  description: 'Join Ponca City United FC, a premier youth soccer club in Ponca City, Oklahoma. Offering professional coaching, competitive teams, and player development programs for all skill levels.',
  keywords: [
    'Ponca City United FC',
    'youth soccer',
    'Ponca City Oklahoma',
    'soccer club',
    'football club',
    'youth sports',
    'soccer training',
    'competitive soccer',
    'player development',
    'soccer teams',
    'Oklahoma soccer',
    'youth athletics',
    'soccer coaching',
    'sports club',
    'soccer registration'
  ],
  image: '/logo.png',
  url: 'https://poncacityunited.com',
  siteName: 'Ponca City United FC',
  locale: 'en_US',
  type: 'website' as const
};

export function generateMetadata(props: SEOProps = {}): Metadata {
  const {
    title = defaultSEO.title,
    description = defaultSEO.description,
    keywords = defaultSEO.keywords,
    image = defaultSEO.image,
    url = defaultSEO.url,
    type = defaultSEO.type,
    publishedTime,
    modifiedTime,
    author,
    section,
    tags
  } = props;

  const fullTitle = title === defaultSEO.title ? title : `${title} | Ponca City United FC`;
  const imageUrl = image.startsWith('http') ? image : `${defaultSEO.url}${image}`;
  const canonicalUrl = url.startsWith('http') ? url : `${defaultSEO.url}${url}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'Ponca City United FC' }],
    creator: 'Ponca City United FC',
    publisher: 'Ponca City United FC',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(defaultSEO.url),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: defaultSEO.siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
      locale: defaultSEO.locale,
      type: type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags && { tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: '@PoncaCityUnitedFC',
      site: '@PoncaCityUnitedFC',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'google-site-verification-code-here', // Replace with actual verification code
      yandex: 'yandex-verification-code-here', // Replace with actual verification code
      bing: 'bing-verification-code-here', // Replace with actual verification code
    },
    category: 'Sports',
  };
}

// Structured Data for Sports Organization
export function generateSportsOrganizationLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: 'Ponca City United FC',
    alternateName: ['Ponca City United Football Club', 'PC United FC'],
    description: 'Premier youth soccer club in Ponca City, Oklahoma, offering professional coaching and competitive teams for players of all skill levels.',
    url: 'https://poncacityunited.com',
    logo: 'https://poncacityunited.com/logo.png',
    image: 'https://poncacityunited.com/logo.png',
    sport: 'Soccer',
    foundingDate: '2024',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ponca City',
      addressRegion: 'Oklahoma',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'info@poncacityunited.com',
    },
    sameAs: [
      'https://www.facebook.com/PoncaCityUnitedFC',
      'https://www.instagram.com/poncacityunitedfc',
      'https://twitter.com/PoncaCityUnitedFC',
    ],
    memberOf: {
      '@type': 'SportsOrganization',
      name: 'Oklahoma Soccer Association',
    },
    offers: {
      '@type': 'Offer',
      description: 'Youth soccer programs and training',
      category: 'Sports Training',
    },
  };
}

// Structured Data for Sports Team
export function generateSportsTeamLD(teamName: string, description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: teamName,
    description: description || `${teamName} - Part of Ponca City United FC youth soccer program`,
    sport: 'Soccer',
    memberOf: {
      '@type': 'SportsOrganization',
      name: 'Ponca City United FC',
      url: 'https://poncacityunited.com',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ponca City',
      addressRegion: 'Oklahoma',
      addressCountry: 'US',
    },
  };
}

// Structured Data for Person (Player profiles)
export function generatePlayerLD(player: {
  name: string;
  position: string;
  jerseyNumber: number;
  birthYear: number;
  description?: string;
  photo?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    description: player.description || `${player.position} for Ponca City United FC, jersey #${player.jerseyNumber}`,
    image: player.photo,
    jobTitle: player.position,
    memberOf: {
      '@type': 'SportsTeam',
      name: 'Ponca City United FC',
      url: 'https://poncacityunited.com',
    },
    birthDate: `${player.birthYear}`,
    sport: 'Soccer',
  };
}

// Structured Data for Sports Event
export function generateSportsEventLD(event: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  eventType: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location ? {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ponca City',
        addressRegion: 'Oklahoma',
        addressCountry: 'US',
      },
    } : undefined,
    organizer: {
      '@type': 'SportsOrganization',
      name: 'Ponca City United FC',
      url: 'https://poncacityunited.com',
    },
    sport: 'Soccer',
    eventStatus: 'https://schema.org/EventScheduled',
  };
}

// Structured Data for News Article
export function generateArticleLD(article: {
  headline: string;
  description?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  url?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    description: article.description,
    author: {
      '@type': 'Person',
      name: article.author || 'Ponca City United FC',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ponca City United FC',
      logo: {
        '@type': 'ImageObject',
        url: 'https://poncacityunited.com/logo.png',
      },
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    image: article.image ? {
      '@type': 'ImageObject',
      url: article.image,
    } : undefined,
    url: article.url,
    mainEntityOfPage: article.url,
  };
}