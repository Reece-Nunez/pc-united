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

interface SponsorshipEmailProps {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  sponsorshipLevel: string;
  amount: number;
  logoPlacement?: string;
  paymentMethod: string;
  logoUrl?: string;
  signature: string;
  signatureDate: string;
  submittedAt: string;
}

export default function SponsorshipEmail({
  businessName,
  contactPerson,
  email,
  phone,
  sponsorshipLevel,
  amount,
  logoPlacement,
  paymentMethod,
  logoUrl,
  signature,
  signatureDate,
  submittedAt,
}: SponsorshipEmailProps) {
  const levelLabels: Record<string, string> = {
    platinum: 'Platinum — $2,500',
    gold: 'Gold — $1,000',
    silver: 'Silver — $500',
    bronze: 'Bronze / Friends of the Team — $250',
  };

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px 8px 0 0' }}>
            <Row>
              <Column>
                <Heading style={{ color: '#ffffff', textAlign: 'center', margin: '0', fontSize: '24px' }}>
                  Ponca City United FC
                </Heading>
                <Text style={{ color: '#94a3b8', textAlign: 'center', margin: '5px 0 0 0', fontSize: '14px' }}>
                  New Sponsorship Submission
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '0 0 8px 8px' }}>
            <Heading style={{ color: '#0f172a', fontSize: '20px', marginTop: '0' }}>
              New Sponsorship Commitment
            </Heading>
            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5' }}>
              A business has submitted a sponsorship commitment through the website.
            </Text>

            <Hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

            {/* Business Info */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                Business Information
              </Heading>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Business:</strong> {businessName}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Contact:</strong> {contactPerson}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Phone:</strong> {phone}
              </Text>
            </Section>

            {/* Sponsorship Details */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                Sponsorship Details
              </Heading>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Level:</strong> {levelLabels[sponsorshipLevel] || sponsorshipLevel}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Amount:</strong> ${amount.toLocaleString()}
              </Text>
              {logoPlacement && (
                <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                  <strong>Logo Placement:</strong> {logoPlacement}
                </Text>
              )}
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Payment Method:</strong> {paymentMethod}
              </Text>
              {logoUrl && (
                <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                  <strong>Logo File:</strong> Uploaded — {logoUrl}
                </Text>
              )}
            </Section>

            {/* Signature */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                Authorization
              </Heading>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Signature:</strong> <em>{signature}</em>
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Date:</strong> {signatureDate}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Submitted:</strong> {submittedAt}
              </Text>
            </Section>

            {/* Next Steps */}
            <Section style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '6px' }}>
              <Heading style={{ color: '#ffffff', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                Next Steps
              </Heading>
              <Text style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0' }}>
                1. Follow up with the business to confirm details
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0' }}>
                2. Coordinate payment through the club's account
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0' }}>
                3. Collect logo files if not uploaded
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0' }}>
                4. Add sponsor to website and social media
              </Text>
            </Section>

            <Section style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '6px', marginTop: '20px', border: '1px solid #fbbf24' }}>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '0', fontWeight: 'bold' }}>
                Reply directly to {email} to follow up with {contactPerson}.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center', padding: '20px' }}>
            <Text style={{ color: '#6b7280', fontSize: '12px', margin: '0' }}>
              Ponca City United FC
            </Text>
            <Text style={{ color: '#6b7280', fontSize: '12px', margin: '5px 0 0 0' }}>
              Ponca City, Oklahoma
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
