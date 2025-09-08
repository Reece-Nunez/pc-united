-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Player Information
  player_first_name VARCHAR(100) NOT NULL,
  player_last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  grade VARCHAR(10) NOT NULL,
  school VARCHAR(200),
  preferred_position VARCHAR(50),
  previous_experience TEXT,
  tshirt_size VARCHAR(20) NOT NULL,
  
  -- Parent/Guardian Information
  parent_first_name VARCHAR(100) NOT NULL,
  parent_last_name VARCHAR(100) NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  parent_address VARCHAR(500) NOT NULL,
  parent_city VARCHAR(100) NOT NULL,
  parent_state VARCHAR(10) NOT NULL,
  parent_zip VARCHAR(20) NOT NULL,
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(200) NOT NULL,
  emergency_contact_phone VARCHAR(20) NOT NULL,
  emergency_contact_relation VARCHAR(100) NOT NULL,
  
  -- Medical Information
  medical_conditions TEXT,
  allergies TEXT,
  medications TEXT,
  
  -- Additional Information
  additional_info TEXT,
  parent_signature VARCHAR(200) NOT NULL,
  agrees_to_terms BOOLEAN NOT NULL DEFAULT false,
  
  -- Status and tracking
  registration_status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'pending'
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE
ON registrations FOR EACH ROW EXECUTE FUNCTION
update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (for registration form)
CREATE POLICY "Allow public inserts" ON registrations FOR INSERT
WITH CHECK (true);

-- Create policy to allow authenticated reads (for admin dashboard)
CREATE POLICY "Allow authenticated reads" ON registrations FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated updates (for admin)
CREATE POLICY "Allow authenticated updates" ON registrations FOR UPDATE
USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registrations_player_name ON registrations(player_last_name, player_first_name);
CREATE INDEX IF NOT EXISTS idx_registrations_parent_email ON registrations(parent_email);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(registration_status);

-- Insert sample data for testing (optional)
-- You can remove this section in production
INSERT INTO registrations (
  player_first_name, player_last_name, date_of_birth, grade, school,
  preferred_position, previous_experience, tshirt_size,
  parent_first_name, parent_last_name, parent_email, parent_phone,
  parent_address, parent_city, parent_state, parent_zip,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  medical_conditions, allergies, medications, additional_info,
  parent_signature, agrees_to_terms
) VALUES (
  'Test', 'Player', '2010-05-15', '8', 'Ponca City Middle School',
  'Forward', 'Played recreational soccer for 2 years', 'Youth M',
  'Test', 'Parent', 'test@example.com', '580-123-4567',
  '123 Main St', 'Ponca City', 'OK', '74601',
  'Test Emergency Contact', '580-987-6543', 'Grandparent',
  'None', 'None', 'None', 'This is a test registration',
  'Test Parent', true
);