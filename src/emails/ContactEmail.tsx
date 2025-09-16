import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Row,
  Column,
} from '@react-email/components';

interface ContactEmailProps {
  name: string;
  email: string;
  phone?: string;
  playerBirthYear?: string;
  subject?: string;
  message: string;
  submittedAt: string;
}

export default function ContactEmail({
  name,
  email,
  phone,
  playerBirthYear,
  subject,
  message,
  submittedAt,
}: ContactEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header with Logo */}
          <Section style={{ backgroundColor: '#1e40af', padding: '20px', borderRadius: '8px 8px 0 0' }}>
            <Row>
              <Column>
                <Heading style={{ color: '#ffffff', textAlign: 'center', margin: '0', fontSize: '24px' }}>
                  ⚽ Ponca City United FC
                </Heading>
                <Text style={{ color: '#dbeafe', textAlign: 'center', margin: '5px 0 0 0', fontSize: '14px' }}>
                  Contact Form Submission
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '0 0 8px 8px' }}>
            <Heading style={{ color: '#1e40af', fontSize: '20px', marginTop: '0' }}>
              New Contact Form Message
            </Heading>

            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5' }}>
              Someone has reached out through the contact form on the Ponca City United FC website.
            </Text>

            <Hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

            {/* Contact Information */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                📞 Contact Information
              </Heading>
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Name:</strong> {name}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Email:</strong> {email}
                  </Text>
                  {phone && (
                    <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                      <strong>Phone:</strong> {phone}
                    </Text>
                  )}
                </Column>
                <Column style={{ width: '50%' }}>
                  {playerBirthYear && (
                    <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                      <strong>Player Birth Year:</strong> {playerBirthYear}
                    </Text>
                  )}
                  {subject && (
                    <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                      <strong>Subject:</strong> {subject}
                    </Text>
                  )}
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Submitted:</strong> {submittedAt}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Message Content */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                💬 Message
              </Heading>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                backgroundColor: '#f9fafb',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                {message}
              </Text>
            </Section>

            {/* Response Guidelines */}
            <Section style={{ backgroundColor: '#1e40af', padding: '20px', borderRadius: '6px' }}>
              <Heading style={{ color: '#ffffff', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                📋 Response Guidelines
              </Heading>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Respond within 24 hours when possible
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • If about registration, provide current team status and next steps
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Include practice schedule and fee information as relevant
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • CC other coaches on important inquiries
              </Text>
            </Section>

            {/* Quick Response Section */}
            <Section style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '6px', marginTop: '20px', border: '1px solid #fbbf24' }}>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '0', fontWeight: 'bold' }}>
                💡 Quick Reply: Reply directly to {email} to respond to this inquiry.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center', padding: '20px' }}>
            <Text style={{ color: '#6b7280', fontSize: '12px', margin: '0' }}>
              Ponca City United FC U10 Developmental Team
            </Text>
            <Text style={{ color: '#6b7280', fontSize: '12px', margin: '5px 0 0 0' }}>
              Johnson Park • 1400 N Ash Ponca City, Oklahoma
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}