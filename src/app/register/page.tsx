'use client';

import { useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitRegistration, Registration } from '@/lib/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && 
         !url.includes('your_supabase_project_url') && 
         !key.includes('your_supabase_anon_key');
};

export default function RegisterPage() {
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
    parent_address: '',
    parent_city: '',
    parent_state: 'OK',
    parent_zip: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    medical_conditions: '',
    allergies: '',
    medications: '',
    additional_info: '',
    parent_signature: '',
    agrees_to_terms: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const { data, error } = await submitRegistration(formData);
      
      if (error) {
        setSubmitMessage(`Error: ${error.message}`);
      } else {
        setSubmitMessage('Registration submitted successfully! We will contact you soon.');
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
          parent_address: '',
          parent_city: '',
          parent_state: 'OK',
          parent_zip: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relation: '',
          medical_conditions: '',
          allergies: '',
          medications: '',
          additional_info: '',
          parent_signature: '',
          agrees_to_terms: false,
        });
      }
    } catch (error) {
      setSubmitMessage('An unexpected error occurred. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-team-blue mb-4">
              Player Registration
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join Ponca City United FC for the upcoming season. Please fill out all required information below.
            </p>
            
            {!isSupabaseConfigured() && (
              <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 rounded-lg max-w-2xl mx-auto">
                <p className="text-yellow-800 text-sm">
                  <strong>Setup Required:</strong> The registration form is ready to use but needs Supabase configuration. 
                  Please add your Supabase credentials to the .env.local file to enable form submissions.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Player Information */}
              <div>
                <h2 className="text-2xl font-bold text-team-blue mb-6">Player Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="player_first_name"
                      value={formData.player_first_name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="player_last_name"
                      value={formData.player_last_name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade *
                    </label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    >
                      <option value="">Select Grade</option>
                      <option value="K">Kindergarten</option>
                      <option value="1">1st Grade</option>
                      <option value="2">2nd Grade</option>
                      <option value="3">3rd Grade</option>
                      <option value="4">4th Grade</option>
                      <option value="5">5th Grade</option>
                      <option value="6">6th Grade</option>
                      <option value="7">7th Grade</option>
                      <option value="8">8th Grade</option>
                      <option value="9">9th Grade</option>
                      <option value="10">10th Grade</option>
                      <option value="11">11th Grade</option>
                      <option value="12">12th Grade</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School
                    </label>
                    <input
                      type="text"
                      name="school"
                      value={formData.school}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Position
                    </label>
                    <select
                      name="preferred_position"
                      value={formData.preferred_position}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    >
                      <option value="">Select Position</option>
                      <option value="Forward">Forward</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Defender">Defender</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                      <option value="No Preference">No Preference</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous Soccer Experience
                  </label>
                  <textarea
                    name="previous_experience"
                    value={formData.previous_experience}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    placeholder="Describe any previous soccer experience..."
                  />
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    T-Shirt Size *
                  </label>
                  <select
                    name="tshirt_size"
                    value={formData.tshirt_size}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
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
                    <option value="Adult XXL">Adult XXL</option>
                  </select>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div>
                <h2 className="text-2xl font-bold text-team-blue mb-6">Parent/Guardian Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="parent_first_name"
                      value={formData.parent_first_name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="parent_last_name"
                      value={formData.parent_last_name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="parent_email"
                      value={formData.parent_email}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="parent_phone"
                      value={formData.parent_phone}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="parent_address"
                    value={formData.parent_address}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="parent_city"
                      value={formData.parent_city}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      name="parent_state"
                      value={formData.parent_state}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    >
                      <option value="OK">Oklahoma</option>
                      <option value="TX">Texas</option>
                      <option value="KS">Kansas</option>
                      <option value="AR">Arkansas</option>
                      <option value="MO">Missouri</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="parent_zip"
                      value={formData.parent_zip}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h2 className="text-2xl font-bold text-team-blue mb-6">Emergency Contact</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship *
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_relation"
                      value={formData.emergency_contact_relation}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Grandparent, Uncle, etc."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h2 className="text-2xl font-bold text-team-blue mb-6">Medical Information</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Conditions
                    </label>
                    <textarea
                      name="medical_conditions"
                      value={formData.medical_conditions}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                      placeholder="List any medical conditions we should be aware of..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allergies
                    </label>
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                      placeholder="List any allergies..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Medications
                    </label>
                    <textarea
                      name="medications"
                      value={formData.medications}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                      placeholder="List any current medications..."
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h2 className="text-2xl font-bold text-team-blue mb-6">Additional Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments
                  </label>
                  <textarea
                    name="additional_info"
                    value={formData.additional_info}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    placeholder="Anything else you'd like us to know about your player..."
                  />
                </div>
              </div>

              {/* Signature and Agreement */}
              <div>
                <h2 className="text-2xl font-bold text-team-blue mb-6">Agreement</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent/Guardian Digital Signature *
                    </label>
                    <input
                      type="text"
                      name="parent_signature"
                      value={formData.parent_signature}
                      onChange={handleInputChange}
                      required
                      placeholder="Type your full name as digital signature"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agrees_to_terms"
                        checked={formData.agrees_to_terms}
                        onChange={handleInputChange}
                        required
                        className="mt-1 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">
                        I agree to the terms and conditions of Ponca City United FC. I understand that 
                        participation in soccer activities involves risks, and I give permission for my 
                        child to participate. I also agree to the registration fee of $150. *
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-lg text-white font-bold transition duration-300 ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-team-red hover:bg-red-700 transform hover:scale-105 cursor-pointer'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`text-center p-4 rounded-lg ${
                  submitMessage.includes('Error') 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {submitMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}