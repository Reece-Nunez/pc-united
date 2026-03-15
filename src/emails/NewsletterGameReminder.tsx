import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
} from '@react-email/components';

interface Props {
  opponent: string;
  gameDate: string;
  gameTime: string;
  location: string;
  homeAway: string;
}

export default function NewsletterGameReminder({
  opponent,
  gameDate,
  gameTime,
  location,
  homeAway,
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#0f172a', borderRadius: '8px 8px 0 0', padding: '24px', textAlign: 'center' as const }}>
            <Heading style={{ color: '#ffffff', fontSize: '24px', margin: 0 }}>
              Ponca City United FC
            </Heading>
            <Text style={{ color: '#fbbf24', fontSize: '14px', margin: '8px 0 0', fontWeight: 'bold' }}>
              Game Day Reminder
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
            <Text style={{ fontSize: '16px', color: '#374151', marginTop: 0 }}>
              Don&apos;t forget! We have a game tomorrow.
            </Text>

            <Heading style={{ fontSize: '20px', color: '#1f2937', marginTop: '16px' }}>
              vs {opponent}
            </Heading>

            <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
              <Text style={{ margin: '4px 0', color: '#374151', fontSize: '15px' }}>
                <strong>Date:</strong> {gameDate}
              </Text>
              <Text style={{ margin: '4px 0', color: '#374151', fontSize: '15px' }}>
                <strong>Time:</strong> {gameTime}
              </Text>
              <Text style={{ margin: '4px 0', color: '#374151', fontSize: '15px' }}>
                <strong>Location:</strong> {location}
              </Text>
              <Text style={{ margin: '4px 0', color: '#374151', fontSize: '15px' }}>
                <strong>{homeAway}</strong>
              </Text>
            </Section>

            <Text style={{ color: '#6b7280', fontSize: '13px', marginTop: '24px' }}>
              Come out and support the team!
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
