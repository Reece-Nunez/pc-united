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
  opponent: string;
  ourScore: number;
  opponentScore: number;
  gameDate: string;
  result: 'win' | 'loss' | 'draw';
}

export default function NewsletterGameResult({
  opponent,
  ourScore,
  opponentScore,
  gameDate,
  result,
}: Props) {
  const resultColors = {
    win: { bg: '#dcfce7', text: '#166534', label: 'Victory!' },
    loss: { bg: '#fee2e2', text: '#991b1b', label: 'Tough Loss' },
    draw: { bg: '#fef9c3', text: '#854d0e', label: 'Draw' },
  };
  const r = resultColors[result];

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
              Game Result
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px', textAlign: 'center' as const }}>
            <Section style={{ backgroundColor: r.bg, borderRadius: '8px', padding: '8px 16px', display: 'inline-block' as const, marginBottom: '16px' }}>
              <Text style={{ color: r.text, fontWeight: 'bold', fontSize: '14px', margin: 0 }}>
                {r.label}
              </Text>
            </Section>

            <Heading style={{ fontSize: '18px', color: '#6b7280', marginTop: '8px', marginBottom: '4px', fontWeight: 'normal' }}>
              vs {opponent}
            </Heading>

            <Heading style={{ fontSize: '48px', color: '#1f2937', margin: '8px 0' }}>
              {ourScore} - {opponentScore}
            </Heading>

            <Text style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0' }}>
              {gameDate}
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
