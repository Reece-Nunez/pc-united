import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
  Row,
  Column,
} from '@react-email/components';

interface RegistrationConfirmationEmailProps {
  playerName: string;
  parentName: string;
  ageGroup: string;
  submittedAt: string;
}

export default function RegistrationConfirmationEmail({
  playerName,
  parentName,
  ageGroup,
  submittedAt,
}: RegistrationConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header with Logo */}
          <Section style={{ backgroundColor: '#1e40af', padding: '20px', borderRadius: '8px 8px 0 0' }}>
            <Row>
              <Column style={{ textAlign: 'center' }}>
                <Img src="https://pc-united.s3.us-east-1.amazonaws.com/logo.png" alt="Ponca City United FC Logo" style={{ height: '60px', width: 'auto', marginBottom: '10px' }} />
                <Heading style={{ color: '#ffffff', textAlign: 'center', margin: '0', fontSize: '24px' }}>
                  Ponca City United FC
                </Heading>
                <Text style={{ color: '#dbeafe', textAlign: 'center', margin: '5px 0 0 0', fontSize: '14px' }}>
                  Registration Confirmation
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '0 0 8px 8px' }}>
            <Heading style={{ color: '#1e40af', fontSize: '20px', marginTop: '0' }}>
              Thank You for Registering!
            </Heading>

            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
              Dear {parentName},
            </Text>

            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5' }}>
              Thank you for registering <strong>{playerName}</strong> for our {ageGroup} Developmental team!
              We're excited to have them join the Ponca City United FC family.
            </Text>

            <Hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

            {/* Registration Details */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                📋 Registration Details
              </Heading>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Player:</strong> {playerName}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Age Group:</strong> {ageGroup} Developmental Team
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Registration Date:</strong> {submittedAt}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>Received</span>
              </Text>
            </Section>

            {/* Next Steps */}
            <Section style={{ backgroundColor: '#1e40af', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#ffffff', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                📋 What Happens Next?
              </Heading>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • We will review {playerName}'s registration within 24 hours
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • You will receive a follow-up email with team placement and next steps
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Practice schedules and uniform information will be provided
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Registration fees are due before the first practice
              </Text>
            </Section>

            {/* Team Information */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                ⚽ About Our {ageGroup} Team
              </Heading>
              <Text style={{ color: '#374151', fontSize: '14px', margin: '5px 0' }}>
                <strong>Practice Schedule:</strong> Tuesday & Thursday Evenings (times vary by season)
              </Text>
              <Text style={{ color: '#374151', fontSize: '14px', margin: '5px 0' }}>
                <strong>Practice Location:</strong> Johnson Park, 1400 N Ash Ponca City, Oklahoma
              </Text>
              <Text style={{ color: '#374151', fontSize: '14px', margin: '5px 0' }}>
                <strong>Season Fees:</strong> Spring and Fall seasons are $95 each. Summer 3v3 tournaments around $35 each.
              </Text>
              <Text style={{ color: '#374151', fontSize: '14px', margin: '10px 0 5px 0' }}>
                <strong>Our Philosophy:</strong> We focus on skill development, equal playing time, and ensuring
                every player has fun while learning in a supportive team environment.
              </Text>
            </Section>

            {/* Contact Information */}
            <Section style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '6px', border: '1px solid #fbbf24' }}>
              <Heading style={{ color: '#92400e', fontSize: '16px', marginTop: '0', marginBottom: '10px' }}>
                📞 Questions or Concerns?
              </Heading>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '5px 0' }}>
                Feel free to contact us if you have any questions:
              </Text>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '2px 0' }}>
                • Email: info@poncacityunited.com
              </Text>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '2px 0' }}>
                • Veronica: (580) 304-6922
              </Text>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '2px 0' }}>
                • Reece: (435) 660-6100
              </Text>
              <Text style={{ color: '#92400e', fontSize: '14px', margin: '2px 0' }}>
                • Joshua: (801) 851-0297
              </Text>
            </Section>

            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5', marginTop: '20px' }}>
              We're looking forward to a great season with {playerName}!
            </Text>

            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5', marginTop: '10px' }}>
              Go United! ⚽
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center', padding: '20px' }}>
            <Text style={{ color: '#6b7280', fontSize: '12px', margin: '0' }}>
              Ponca City United FC {ageGroup} Developmental Team
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