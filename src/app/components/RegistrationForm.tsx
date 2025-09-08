'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface FormData {
  // Player Information
  playerFirstName: string
  playerLastName: string
  dateOfBirth: string
  grade: string
  school: string
  preferredPosition: string
  previousExperience: string
  tshirtSize: string
  
  // Parent/Guardian Information
  parentFirstName: string
  parentLastName: string
  parentEmail: string
  parentPhone: string
  parentAddress: string
  parentCity: string
  parentState: string
  parentZip: string
  
  // Emergency Contact
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  
  // Medical Information
  medicalConditions: string
  allergies: string
  medications: string
  
  // Additional Information
  additionalInfo: string
  parentSignature: string
  agreesToTerms: boolean
}

export default function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    playerFirstName: '',
    playerLastName: '',
    dateOfBirth: '',
    grade: '',
    school: '',
    preferredPosition: '',
    previousExperience: '',
    tshirtSize: '',
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    parentAddress: '',
    parentCity: '',
    parentState: 'OK',
    parentZip: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    medicalConditions: '',
    allergies: '',
    medications: '',
    additionalInfo: '',
    parentSignature: '',
    agreesToTerms: false
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\d\s\-\(\)\+\.]{10,}$/
    return phoneRegex.test(phone.replace(/\D/g, '')) && phone.replace(/\D/g, '').length >= 10
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    // Required field validation
    if (!formData.playerFirstName.trim()) newErrors.playerFirstName = 'First name is required'
    if (!formData.playerLastName.trim()) newErrors.playerLastName = 'Last name is required'
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!formData.grade) newErrors.grade = 'Grade is required'
    if (!formData.tshirtSize) newErrors.tshirtSize = 'T-shirt size is required'

    if (!formData.parentFirstName.trim()) newErrors.parentFirstName = 'Parent first name is required'
    if (!formData.parentLastName.trim()) newErrors.parentLastName = 'Parent last name is required'
    if (!formData.parentEmail.trim()) {
      newErrors.parentEmail = 'Email is required'
    } else if (!validateEmail(formData.parentEmail)) {
      newErrors.parentEmail = 'Please enter a valid email address'
    }
    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = 'Phone number is required'
    } else if (!validatePhone(formData.parentPhone)) {
      newErrors.parentPhone = 'Please enter a valid phone number'
    }
    if (!formData.parentAddress.trim()) newErrors.parentAddress = 'Address is required'
    if (!formData.parentCity.trim()) newErrors.parentCity = 'City is required'
    if (!formData.parentZip.trim()) newErrors.parentZip = 'ZIP code is required'

    if (!formData.emergencyContactName.trim()) newErrors.emergencyContactName = 'Emergency contact name is required'
    if (!formData.emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = 'Emergency contact phone is required'
    } else if (!validatePhone(formData.emergencyContactPhone)) {
      newErrors.emergencyContactPhone = 'Please enter a valid phone number'
    }
    if (!formData.emergencyContactRelation.trim()) newErrors.emergencyContactRelation = 'Emergency contact relationship is required'

    if (!formData.parentSignature.trim()) newErrors.parentSignature = 'Digital signature is required'
    if (!formData.agreesToTerms) newErrors.agreesToTerms = 'You must agree to the terms and conditions'

    // Age validation
    if (formData.dateOfBirth) {
      const today = new Date()
      const birthDate = new Date(formData.dateOfBirth)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        // Subtract one year if birthday hasn't occurred this year
      }
      
      if (age < 4 || age > 18) {
        newErrors.dateOfBirth = 'Player must be between 4 and 18 years old'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getInputClasses = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
    const normalClasses = "border-gray-300 focus:ring-pcuf-blue focus:border-pcuf-blue"
    const errorClasses = "border-red-500 focus:ring-red-500 focus:border-red-500"
    
    return `${baseClasses} ${errors[fieldName] ? errorClasses : normalClasses}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submitting
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorElement = document.querySelector('.border-red-500')
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      // Transform form data to match database schema
      const registrationData = {
        player_first_name: formData.playerFirstName,
        player_last_name: formData.playerLastName,
        date_of_birth: formData.dateOfBirth,
        grade: formData.grade,
        school: formData.school,
        preferred_position: formData.preferredPosition,
        previous_experience: formData.previousExperience,
        tshirt_size: formData.tshirtSize,
        parent_first_name: formData.parentFirstName,
        parent_last_name: formData.parentLastName,
        parent_email: formData.parentEmail,
        parent_phone: formData.parentPhone,
        parent_address: formData.parentAddress,
        parent_city: formData.parentCity,
        parent_state: formData.parentState,
        parent_zip: formData.parentZip,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relation: formData.emergencyContactRelation,
        medical_conditions: formData.medicalConditions || 'None',
        allergies: formData.allergies || 'None',
        medications: formData.medications || 'None',
        additional_info: formData.additionalInfo,
        parent_signature: formData.parentSignature,
        agrees_to_terms: formData.agreesToTerms,
        registration_status: 'pending',
        payment_status: 'pending'
      }

      const { data, error } = await supabase
        .from('registrations')
        .insert([registrationData])
        .select()

      if (error) {
        throw error
      }

      console.log('Registration successful:', data)
      setSubmitStatus('success')
    } catch (error) {
      console.error('Registration error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-pcuf-blue mb-4">Registration Successful!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for registering with Ponca City United FC. We will contact you soon with next steps.
        </p>
        <button
          onClick={() => setSubmitStatus('idle')}
          className="bg-pcuf-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Submit Another Registration
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Player Information Section */}
      <div>
        <h2 className="text-2xl font-bold text-pcuf-blue mb-6">Player Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              name="playerFirstName"
              value={formData.playerFirstName}
              onChange={handleInputChange}
              required
              className={getInputClasses('playerFirstName')}
            />
            {errors.playerFirstName && (
              <p className="mt-1 text-sm text-red-600">{errors.playerFirstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              name="playerLastName"
              value={formData.playerLastName}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth *
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Grade *
            </label>
            <select
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Position
            </label>
            <select
              name="preferredPosition"
              value={formData.preferredPosition}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            >
              <option value="">Select Position</option>
              <option value="Forward">Forward</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Defender">Defender</option>
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="No Preference">No Preference</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              T-Shirt Size *
            </label>
            <select
              name="tshirtSize"
              value={formData.tshirtSize}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
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
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Previous Soccer Experience
          </label>
          <textarea
            name="previousExperience"
            value={formData.previousExperience}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            placeholder="Please describe any previous soccer experience..."
          />
        </div>
      </div>

      {/* Parent/Guardian Information Section */}
      <div>
        <h2 className="text-2xl font-bold text-pcuf-blue mb-6">Parent/Guardian Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              name="parentFirstName"
              value={formData.parentFirstName}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              name="parentLastName"
              value={formData.parentLastName}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="parentEmail"
              value={formData.parentEmail}
              onChange={handleInputChange}
              required
              className={getInputClasses('parentEmail')}
            />
            {errors.parentEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.parentEmail}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="parentPhone"
              value={formData.parentPhone}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <input
              type="text"
              name="parentAddress"
              value={formData.parentAddress}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              name="parentCity"
              value={formData.parentCity}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <select
                name="parentState"
                value={formData.parentState}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
              >
                <option value="OK">Oklahoma</option>
                <option value="TX">Texas</option>
                <option value="AR">Arkansas</option>
                <option value="KS">Kansas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code *
              </label>
              <input
                type="text"
                name="parentZip"
                value={formData.parentZip}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div>
        <h2 className="text-2xl font-bold text-pcuf-blue mb-6">Emergency Contact</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Name *
            </label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship *
            </label>
            <input
              type="text"
              name="emergencyContactRelation"
              value={formData.emergencyContactRelation}
              onChange={handleInputChange}
              required
              placeholder="e.g., Grandparent, Aunt, Friend"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
        </div>
      </div>

      {/* Medical Information Section */}
      <div>
        <h2 className="text-2xl font-bold text-pcuf-blue mb-6">Medical Information</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical Conditions
            </label>
            <textarea
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
              placeholder="Please list any medical conditions (or write 'None')"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
              placeholder="Please list any allergies (or write 'None')"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
              placeholder="Please list any current medications (or write 'None')"
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <h2 className="text-2xl font-bold text-pcuf-blue mb-6">Additional Information</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments or Special Requests
          </label>
          <textarea
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            placeholder="Any additional information you'd like us to know..."
          />
        </div>
      </div>

      {/* Agreement and Signature */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-pcuf-blue mb-6">Agreement and Consent</h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="agreesToTerms"
                checked={formData.agreesToTerms}
                onChange={handleInputChange}
                required
                className={`mt-1 h-4 w-4 text-pcuf-blue focus:ring-pcuf-blue border-gray-300 rounded ${errors.agreesToTerms ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-700">
                I agree to the terms and conditions of participation in Ponca City United FC. 
                I understand that soccer is a contact sport and injuries may occur. I release 
                the club, coaches, and organizers from liability for injuries that may occur 
                during normal play. *
              </span>
            </label>
            {errors.agreesToTerms && (
              <p className="mt-1 text-sm text-red-600 ml-7">{errors.agreesToTerms}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent/Guardian Digital Signature *
            </label>
            <input
              type="text"
              name="parentSignature"
              value={formData.parentSignature}
              onChange={handleInputChange}
              required
              placeholder="Type your full name as digital signature"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pcuf-blue focus:border-pcuf-blue"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        {submitStatus === 'error' && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            There was an error submitting your registration. Please try again.
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-pcuf-red hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Registration'}
        </button>
        <p className="text-sm text-gray-600 mt-4">
          Registration fees and additional information will be sent to your email after submission.
        </p>
      </div>
    </form>
  )
}