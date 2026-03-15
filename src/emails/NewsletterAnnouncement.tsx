import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
} from '@react-email/components';

interface Props {
  title: string;
  content: string;
  announcementType: 'general' | 'urgent' | 'celebration' | 'reminder';
}

export default function NewsletterAnnouncement({
  title,
  content,
  announcementType,
}: Props) {
  const typeConfig = {
    general: { label: 'Announcement', color: '#2563eb' },
    urgent: { label: 'Urgent', color: '#dc2626' },
    celebration: { label: 'Celebration', color: '#16a34a' },
    reminder: { label: 'Reminder', color: '#d97706' },
  };
  const config = typeConfig[announcementType] || typeConfig.general;

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
              Team {config.label}
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
            <Section style={{ borderLeft: `4px solid ${config.color}`, paddingLeft: '16px', marginBottom: '16px' }}>
              <Heading style={{ fontSize: '20px', color: '#1f2937', marginTop: 0 }}>
                {title}
              </Heading>
            </Section>

            <Text style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const }}>
              {content}
            </Text>
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
