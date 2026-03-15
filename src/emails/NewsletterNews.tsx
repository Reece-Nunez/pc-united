import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Img,
} from '@react-email/components';

interface Props {
  title: string;
  excerpt: string;
  slug: string;
  featuredImage?: string;
  author?: string;
}

export default function NewsletterNews({
  title,
  excerpt,
  slug,
  featuredImage,
  author,
}: Props) {
  const articleUrl = `https://poncacityunited.com/team/news/${slug}`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#0f172a', borderRadius: '8px 8px 0 0', padding: '24px', textAlign: 'center' as const }}>
            <Heading style={{ color: '#ffffff', fontSize: '24px', margin: 0 }}>
              Ponca City United FC
            </Heading>
            <Text style={{ color: '#93c5fd', fontSize: '14px', margin: '8px 0 0' }}>
              Team News
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
            {featuredImage && (
              <Img
                src={featuredImage}
                alt={title}
                width="100%"
                style={{ borderRadius: '8px', marginBottom: '16px', maxHeight: '250px', objectFit: 'cover' as const }}
              />
            )}

            <Heading style={{ fontSize: '22px', color: '#1f2937', marginTop: 0 }}>
              {title}
            </Heading>

            {author && (
              <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 12px' }}>
                By {author}
              </Text>
            )}

            <Text style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6' }}>
              {excerpt}
            </Text>

            <Section style={{ textAlign: 'center' as const, marginTop: '24px' }}>
              <Link
                href={articleUrl}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Read Full Article
              </Link>
            </Section>
          </Section>

          <Section style={{ textAlign: 'center' as const, padding: '16px' }}>
            <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '4px 0' }}>
              Ponca City United FC &middot; Ponca City, OK
            </Text>
            <Link href="https://poncacityunited.com" style={{ color: '#9ca3af', fontSize: '12px' }}>
              poncacityunited.com
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
