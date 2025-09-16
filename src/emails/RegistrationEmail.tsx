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

interface RegistrationEmailProps {
  playerName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  dateOfBirth: string;
  grade: string;
  school: string;
  preferredPosition: string;
  previousExperience: string;
  tshirtSize: string;
  parentAddress: string;
  parentCity: string;
  parentState: string;
  parentZip: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  medicalConditions: string;
  allergies: string;
  medications: string;
  photoPermission: boolean;
  parentSignature: string;
  submittedAt: string;
}

export default function RegistrationEmail({
  playerName,
  parentName,
  parentEmail,
  parentPhone,
  dateOfBirth,
  grade,
  school,
  preferredPosition,
  previousExperience,
  tshirtSize,
  parentAddress,
  parentCity,
  parentState,
  parentZip,
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelation,
  medicalConditions,
  allergies,
  medications,
  photoPermission,
  parentSignature,
  submittedAt,
}: RegistrationEmailProps) {
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
                  U10 Developmental Team Registration
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '0 0 8px 8px' }}>
            <Heading style={{ color: '#1e40af', fontSize: '20px', marginTop: '0' }}>
              New Player Registration Received
            </Heading>

            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5' }}>
              A new registration has been submitted for the Ponca City United FC U10 team.
            </Text>

            <Hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

            {/* Player Information */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                👤 Player Information
              </Heading>
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Name:</strong> {playerName}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Date of Birth:</strong> {dateOfBirth}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Grade:</strong> {grade || 'Not specified'}
                  </Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>School:</strong> {school || 'Not specified'}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Preferred Position:</strong> {preferredPosition || 'Not specified'}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>T-Shirt Size:</strong> {tshirtSize || 'Not specified'}
                  </Text>
                </Column>
              </Row>
              {previousExperience && (
                <Text style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#374151' }}>
                  <strong>Previous Experience:</strong> {previousExperience}
                </Text>
              )}
            </Section>

            {/* Parent Information */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                👨‍👩‍👧‍👦 Parent/Guardian Information
              </Heading>
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Name:</strong> {parentName}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Email:</strong> {parentEmail}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Phone:</strong> {parentPhone}
                  </Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>Address:</strong> {parentAddress}
                  </Text>
                  <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    <strong>City:</strong> {parentCity}, {parentState} {parentZip}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Emergency Contact */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                🚨 Emergency Contact
              </Heading>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Name:</strong> {emergencyContactName}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Phone:</strong> {emergencyContactPhone}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Relationship:</strong> {emergencyContactRelation}
              </Text>
            </Section>

            {/* Medical Information */}
            {(medicalConditions || allergies || medications) && (
              <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
                <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                  ⚕️ Medical Information
                </Heading>
                {medicalConditions && (
                  <div>
                    <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151', fontWeight: 'bold' }}>
                      Medical Conditions:
                    </Text>
                    <Text style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
                      {medicalConditions}
                    </Text>
                  </div>
                )}
                {allergies && (
                  <div>
                    <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151', fontWeight: 'bold' }}>
                      Allergies:
                    </Text>
                    <Text style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
                      {allergies}
                    </Text>
                  </div>
                )}
                {medications && (
                  <div>
                    <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151', fontWeight: 'bold' }}>
                      Current Medications:
                    </Text>
                    <Text style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
                      {medications}
                    </Text>
                  </div>
                )}
                {!medicalConditions && !allergies && !medications && (
                  <Text style={{ margin: '0', fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                    No medical information reported
                  </Text>
                )}
              </Section>
            )}

            {/* Permissions */}
            <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Heading style={{ color: '#dc2626', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                📝 Permissions & Waivers
              </Heading>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Photo Permission:</strong> {photoPermission ? 'Yes' : 'No'}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Digital Signature:</strong> {parentSignature}
              </Text>
              <Text style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Submitted:</strong> {submittedAt}
              </Text>
            </Section>

            {/* Next Steps */}
            <Section style={{ backgroundColor: '#1e40af', padding: '20px', borderRadius: '6px' }}>
              <Heading style={{ color: '#ffffff', fontSize: '18px', marginTop: '0', marginBottom: '15px' }}>
                📋 Next Steps
              </Heading>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Review registration details and player eligibility
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Contact parent within 24 hours with team placement
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Provide practice schedule and uniform information
              </Text>
              <Text style={{ color: '#dbeafe', fontSize: '14px', margin: '5px 0' }}>
                • Collect registration fees before first practice
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