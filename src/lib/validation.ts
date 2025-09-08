import { Registration } from './supabase';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRegistration(data: Registration): ValidationError[] {
  const errors: ValidationError[] = [];

  // Player Information Validation
  if (!data.player_first_name.trim()) {
    errors.push({ field: 'player_first_name', message: 'Player first name is required' });
  }

  if (!data.player_last_name.trim()) {
    errors.push({ field: 'player_last_name', message: 'Player last name is required' });
  }

  if (!data.date_of_birth) {
    errors.push({ field: 'date_of_birth', message: 'Date of birth is required' });
  } else {
    const birthDate = new Date(data.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 5 || age > 18) {
      errors.push({ field: 'date_of_birth', message: 'Player must be between 5 and 18 years old' });
    }
  }

  if (!data.grade) {
    errors.push({ field: 'grade', message: 'Grade is required' });
  }

  if (!data.tshirt_size) {
    errors.push({ field: 'tshirt_size', message: 'T-shirt size is required' });
  }

  // Parent Information Validation
  if (!data.parent_first_name.trim()) {
    errors.push({ field: 'parent_first_name', message: 'Parent first name is required' });
  }

  if (!data.parent_last_name.trim()) {
    errors.push({ field: 'parent_last_name', message: 'Parent last name is required' });
  }

  if (!data.parent_email.trim()) {
    errors.push({ field: 'parent_email', message: 'Parent email is required' });
  } else if (!/\S+@\S+\.\S+/.test(data.parent_email)) {
    errors.push({ field: 'parent_email', message: 'Please enter a valid email address' });
  }

  if (!data.parent_phone.trim()) {
    errors.push({ field: 'parent_phone', message: 'Parent phone number is required' });
  } else if (!/^[\d\s\-\(\)\+]+$/.test(data.parent_phone)) {
    errors.push({ field: 'parent_phone', message: 'Please enter a valid phone number' });
  }

  if (!data.parent_address.trim()) {
    errors.push({ field: 'parent_address', message: 'Address is required' });
  }

  if (!data.parent_city.trim()) {
    errors.push({ field: 'parent_city', message: 'City is required' });
  }

  if (!data.parent_state) {
    errors.push({ field: 'parent_state', message: 'State is required' });
  }

  if (!data.parent_zip.trim()) {
    errors.push({ field: 'parent_zip', message: 'ZIP code is required' });
  } else if (!/^\d{5}(-\d{4})?$/.test(data.parent_zip)) {
    errors.push({ field: 'parent_zip', message: 'Please enter a valid ZIP code' });
  }

  // Emergency Contact Validation
  if (!data.emergency_contact_name.trim()) {
    errors.push({ field: 'emergency_contact_name', message: 'Emergency contact name is required' });
  }

  if (!data.emergency_contact_phone.trim()) {
    errors.push({ field: 'emergency_contact_phone', message: 'Emergency contact phone is required' });
  } else if (!/^[\d\s\-\(\)\+]+$/.test(data.emergency_contact_phone)) {
    errors.push({ field: 'emergency_contact_phone', message: 'Please enter a valid phone number' });
  }

  if (!data.emergency_contact_relation.trim()) {
    errors.push({ field: 'emergency_contact_relation', message: 'Emergency contact relationship is required' });
  }

  // Agreement Validation
  if (!data.parent_signature.trim()) {
    errors.push({ field: 'parent_signature', message: 'Digital signature is required' });
  }

  if (!data.agrees_to_terms) {
    errors.push({ field: 'agrees_to_terms', message: 'You must agree to the terms and conditions' });
  }

  return errors;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}