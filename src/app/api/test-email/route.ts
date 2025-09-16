import { NextRequest, NextResponse } from 'next/server';
import { sendRegistrationNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Sample registration data for testing
    const sampleRegistration = {
      player_first_name: 'Oliver',
      player_last_name: 'Test Player',
      date_of_birth: '2016-05-15',
      grade: '3rd Grade',
      school: 'Roosevelt Elementary School',
      preferred_position: 'Forward',
      previous_experience: 'Played recreational soccer for 2 years',
      tshirt_size: 'Youth Medium',
      parent_first_name: 'Sarah',
      parent_last_name: 'Test Parent',
      parent_email: 'reecenunez20@gmail.com',
      parent_phone: '(580) 555-0123',
      parent_address: '123 Main Street',
      parent_city: 'Ponca City',
      parent_state: 'Oklahoma',
      parent_zip: '74601',
      emergency_contact_name: 'John Test Emergency',
      emergency_contact_phone: '(580) 555-0456',
      emergency_contact_relation: 'Uncle',
      medical_conditions: 'None',
      allergies: 'Mild peanut allergy',
      medications: 'None currently',
      photo_permission: true,
      agrees_to_terms: true,
      parent_signature: 'Sarah Test Parent',
      season: 'Fall 2025'
    };

    console.log('Sending test email with logo...');
    const result = await sendRegistrationNotification(sampleRegistration, 'U10');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully with logo!',
        data: result.data
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test email API:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}