# Ponca City United FC - Setup Instructions

## Supabase Configuration

To complete the setup of the registration system, you'll need to configure your Supabase connection:

### 1. Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in to your project
2. Navigate to Settings > API
3. Copy your:
   - Project URL
   - Project API Key (anon/public key)

### 2. Update Environment Variables

Edit the `.env.local` file in your project root and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```

### 3. Database Setup

The database schema has already been created with the SQL you provided. The registration system will work with the existing `registrations` table.

## Running the Project

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Visit http://localhost:3000 (or 3001 if 3000 is in use)

## Features Completed

✅ **Component Structure**
- Header with navigation
- Hero section with call-to-action
- About section highlighting club features
- Registration CTA section
- Contact form section
- Footer with links and info

✅ **Registration System**
- Complete registration form with all required fields
- Supabase integration for data storage
- Form validation and error handling
- Responsive design for all devices

✅ **Pages**
- Landing page (/)
- Registration page (/register)

## Form Fields Included

**Player Information:**
- First/Last Name, Date of Birth, Grade, School
- Preferred Position, Previous Experience, T-Shirt Size

**Parent/Guardian Information:**
- First/Last Name, Email, Phone, Full Address

**Emergency Contact:**
- Name, Phone, Relationship

**Medical Information:**
- Medical Conditions, Allergies, Current Medications

**Agreement:**
- Digital Signature, Terms Agreement

## Next Steps

You can now:
1. Test the registration form
2. Add an admin dashboard to view registrations
3. Set up email notifications for new registrations
4. Add payment processing integration
5. Create additional pages (roster, schedule, etc.)

## Deployment

When ready to deploy:
1. Build the project: `npm run build`
2. Deploy to Vercel/Netlify/AWS Amplify
3. Add your production environment variables
4. Update Supabase RLS policies if needed