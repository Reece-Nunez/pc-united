'use client';

import { useState } from 'react';
import { submitRegistration, Registration } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && 
         !url.includes('your_supabase_project_url') && 
         !key.includes('your_supabase_anon_key');
};

export default function RegisterClient() {
  const [formData, setFormData] = useState<Registration>({
    player_first_name: '',
    player_last_name: '',
    date_of_birth: '',
    grade: '',
    school: '',
    preferred_position: '',
    previous_experience: '',
    tshirt_size: '',
    parent_first_name: '',
    parent_last_name: '',
    parent_email: '',
    parent_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    photo_permission: false,
    liability_waiver: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured()) {
      toast.error('Registration system is not configured. Please contact the club administrator.');
      return;
    }

    // Validate required fields
    if (!formData.liability_waiver) {
      toast.error('You must accept the liability waiver to register.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitRegistration(formData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success('Registration submitted successfully! We will contact you within 24 hours.');
      
      // Reset form
      setFormData({
        player_first_name: '',
        player_last_name: '',
        date_of_birth: '',
        grade: '',
        school: '',
        preferred_position: '',
        previous_experience: '',
        tshirt_size: '',
        parent_first_name: '',
        parent_last_name: '',
        parent_email: '',
        parent_phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        medical_notes: '',
        photo_permission: false,
        liability_waiver: false
      });
      
      setCurrentSection(1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextSection = () => {
    setCurrentSection(prev => Math.min(prev + 1, 4));
  };

  const prevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 1));
  };

  const getSectionTitle = (section: number) => {
    switch(section) {
      case 1: return 'Player Information';
      case 2: return 'Parent/Guardian Information';
      case 3: return 'Emergency & Medical Information';
      case 4: return 'Permissions & Waivers';
      default: return 'Registration';
    }
  };

  return (
    <div className="py-8 md:py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3, 4].map((section) => (
              <div key={section} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentSection >= section 
                    ? 'bg-team-blue text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {section}
                </div>
                {section < 4 && (
                  <div className={`w-16 md:w-24 h-1 ${
                    currentSection > section ? 'bg-team-blue' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <h2 className="text-xl md:text-2xl font-bold text-team-blue">
              {getSectionTitle(currentSection)}
            </h2>
            <p className="text-gray-600 text-sm md:text-base">Step {currentSection} of 4</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Section 1: Player Information */}
          {currentSection === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="player_first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Player First Name *
                  </label>
                  <input
                    type="text"
                    id="player_first_name"
                    name="player_first_name"
                    required
                    value={formData.player_first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="player_last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Player Last Name *
                  </label>
                  <input
                    type="text"
                    id="player_last_name"
                    name="player_last_name"
                    required
                    value={formData.player_last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    required
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Grade
                  </label>
                  <select
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="">Select Grade</option>
                    <option value="Pre-K">Pre-K</option>
                    <option value="Kindergarten">Kindergarten</option>
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={`${i+1}`}>{i+1}st Grade</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tshirt_size" className="block text-sm font-medium text-gray-700 mb-2">
                    T-Shirt Size
                  </label>
                  <select
                    id="tshirt_size"
                    name="tshirt_size"
                    value={formData.tshirt_size}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="">Select Size</option>
                    <option value="Youth XS">Youth XS</option>
                    <option value="Youth S">Youth S</option>
                    <option value="Youth M">Youth M</option>
                    <option value="Youth L">Youth L</option>
                    <option value="Youth XL">Youth XL</option>
                    <option value="Adult S">Adult S</option>
                    <option value="Adult M">Adult M</option>
                    <option value="Adult L">Adult L</option>
                    <option value="Adult XL">Adult XL</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
                  School
                </label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                />
              </div>

              <div>
                <label htmlFor="preferred_position" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Position
                </label>
                <select
                  id="preferred_position"
                  name="preferred_position"
                  value={formData.preferred_position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                >
                  <option value="">Select Position</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                  <option value="Any">Any Position</option>
                </select>
              </div>

              <div>
                <label htmlFor="previous_experience" className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Soccer Experience
                </label>
                <textarea
                  id="previous_experience"
                  name="previous_experience"
                  rows={3}
                  value={formData.previous_experience}
                  onChange={handleInputChange}
                  placeholder="Describe any previous soccer experience, teams played for, or years playing..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                />
              </div>
            </div>
          )}

          {/* Section 2: Parent Information */}
          {currentSection === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="parent_first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Parent/Guardian First Name *
                  </label>
                  <input
                    type="text"
                    id="parent_first_name"
                    name="parent_first_name"
                    required
                    value={formData.parent_first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="parent_last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Parent/Guardian Last Name *
                  </label>
                  <input
                    type="text"
                    id="parent_last_name"
                    name="parent_last_name"
                    required
                    value={formData.parent_last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="parent_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="parent_email"
                    name="parent_email"
                    required
                    value={formData.parent_email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="parent_phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="parent_phone"
                    name="parent_phone"
                    required
                    value={formData.parent_phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    defaultValue="Oklahoma"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    name="zip_code"
                    required
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Emergency & Medical */}
          {currentSection === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name *
                  </label>
                  <input
                    type="text"
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    required
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
                <div>
                  <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Phone *
                  </label>
                  <input
                    type="tel"
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    required
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="medical_notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Notes & Allergies
                </label>
                <textarea
                  id="medical_notes"
                  name="medical_notes"
                  rows={4}
                  value={formData.medical_notes}
                  onChange={handleInputChange}
                  placeholder="Please list any medical conditions, allergies, medications, or special instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                />
              </div>
            </div>
          )}

          {/* Section 4: Permissions & Waivers */}
          {currentSection === 4 && (
            <div className="space-y-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="photo_permission"
                  name="photo_permission"
                  checked={formData.photo_permission}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-team-blue border-gray-300 rounded focus:ring-team-blue mt-1"
                />
                <label htmlFor="photo_permission" className="ml-3 text-sm text-gray-700">
                  <strong>Photo Permission:</strong> I give permission for my child's photo to be used in club promotional materials, website, and social media.
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="liability_waiver"
                  name="liability_waiver"
                  checked={formData.liability_waiver}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-team-blue border-gray-300 rounded focus:ring-team-blue mt-1"
                  required
                />
                <label htmlFor="liability_waiver" className="ml-3 text-sm text-gray-700">
                  <strong>Liability Waiver (Required):</strong> I understand that soccer involves inherent risks and hereby release Ponca City United FC, its coaches, volunteers, and facilities from any liability for injuries that may occur during participation in club activities. I acknowledge that my child is physically fit to participate in soccer activities.
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-team-blue mb-2">Next Steps:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• We will review your registration within 24 hours</li>
                  <li>• You will receive an email confirmation with team placement information</li>
                  <li>• Practice schedules and uniform information will be provided</li>
                  <li>• Registration fees are due before the first practice</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevSection}
              disabled={currentSection === 1}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="text-sm text-gray-500">
              {currentSection} of 4
            </div>

            {currentSection < 4 ? (
              <button
                type="button"
                onClick={nextSection}
                className="px-6 py-3 bg-team-blue text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-team-blue"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-team-red text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-team-red disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}