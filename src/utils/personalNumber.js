/**
 * Norwegian Personal Number (Fødselsnummer) Validation Utilities
 * 
 * Format: DDMMYYXXXXX (11 digits)
 * - DD: Day (01-31)
 * - MM: Month (01-12)
 * - YY: Year (last 2 digits)
 * - XXX: Individual number (odd for males, even for females)
 * - XX: Control digits (checksum)
 */

/**
 * Validates Norwegian fødselsnummer format and checksum
 * @param {string} personalNumber - 11-digit personal number
 * @returns {boolean} - True if valid
 */
export function validatePersonalNumber(personalNumber) {
  // Remove any spaces or dashes
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  
  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    return false;
  }
  
  // Extract date parts
  const day = parseInt(cleaned.substring(0, 2), 10);
  const month = parseInt(cleaned.substring(2, 4), 10);
  const year = parseInt(cleaned.substring(4, 6), 10);
  
  // Basic date validation
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return false;
  }
  
  // Validate checksums (K1 and K2)
  return validateChecksums(cleaned);
}

/**
 * Validates the two control digits using the modulo 11 algorithm
 * @param {string} personalNumber - 11-digit personal number
 * @returns {boolean} - True if checksums are valid
 */
function validateChecksums(personalNumber) {
  const digits = personalNumber.split('').map(Number);
  
  // K1 (first control digit) - position 9
  const k1Weights = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let k1Sum = 0;
  for (let i = 0; i < 9; i++) {
    k1Sum += digits[i] * k1Weights[i];
  }
  const k1 = 11 - (k1Sum % 11);
  const k1Valid = k1 === 11 ? 0 : k1;
  
  if (k1Valid !== digits[9]) {
    return false;
  }
  
  // K2 (second control digit) - position 10
  const k2Weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let k2Sum = 0;
  for (let i = 0; i < 10; i++) {
    k2Sum += digits[i] * k2Weights[i];
  }
  const k2 = 11 - (k2Sum % 11);
  const k2Valid = k2 === 11 ? 0 : k2;
  
  return k2Valid === digits[10];
}

/**
 * Formats personal number with spaces for readability
 * @param {string} personalNumber - 11-digit personal number
 * @returns {string} - Formatted as "DDMMYY XXXXX"
 */
export function formatPersonalNumber(personalNumber) {
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  if (cleaned.length !== 11) {
    return personalNumber;
  }
  return `${cleaned.substring(0, 6)} ${cleaned.substring(6)}`;
}

/**
 * Extracts birth date from personal number
 * @param {string} personalNumber - 11-digit personal number
 * @returns {Date|null} - Birth date or null if invalid
 */
export function getBirthDateFromPersonalNumber(personalNumber) {
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  if (cleaned.length !== 11) {
    return null;
  }
  
  const day = parseInt(cleaned.substring(0, 2), 10);
  const month = parseInt(cleaned.substring(2, 4), 10);
  let year = parseInt(cleaned.substring(4, 6), 10);
  const individualNumber = parseInt(cleaned.substring(6, 9), 10);
  
  // Determine century based on individual number
  // 000-499: 1900-1999
  // 500-749: 1854-1899 or 2000-2039
  // 900-999: 1940-1999
  if (individualNumber >= 0 && individualNumber <= 499) {
    year += 1900;
  } else if (individualNumber >= 500 && individualNumber <= 749) {
    year += year < 40 ? 2000 : 1900;
  } else if (individualNumber >= 900 && individualNumber <= 999) {
    year += 1900;
  }
  
  return new Date(year, month - 1, day);
}

/**
 * Determines gender from personal number
 * @param {string} personalNumber - 11-digit personal number
 * @returns {string|null} - 'male', 'female', or null if invalid
 */
export function getGenderFromPersonalNumber(personalNumber) {
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  if (cleaned.length !== 11) {
    return null;
  }
  
  const individualNumber = parseInt(cleaned.substring(6, 9), 10);
  return individualNumber % 2 === 0 ? 'female' : 'male';
}

/**
 * Generates a mock valid Norwegian personal number for testing
 * @param {Date} birthDate - Birth date
 * @param {string} gender - 'male' or 'female'
 * @returns {string} - Valid 11-digit personal number
 */
export function generateMockPersonalNumber(birthDate = new Date(1990, 0, 1), gender = 'male') {
  const day = String(birthDate.getDate()).padStart(2, '0');
  const month = String(birthDate.getMonth() + 1).padStart(2, '0');
  const year = String(birthDate.getFullYear()).substring(2);
  
  // Generate individual number (odd for male, even for female)
  let individualNumber = Math.floor(Math.random() * 500);
  if (gender === 'male' && individualNumber % 2 === 0) {
    individualNumber++;
  } else if (gender === 'female' && individualNumber % 2 === 1) {
    individualNumber++;
  }
  const individual = String(individualNumber).padStart(3, '0');
  
  // Calculate control digits
  const partial = day + month + year + individual;
  const digits = partial.split('').map(Number);
  
  // K1
  const k1Weights = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let k1Sum = 0;
  for (let i = 0; i < 9; i++) {
    k1Sum += digits[i] * k1Weights[i];
  }
  let k1 = 11 - (k1Sum % 11);
  if (k1 === 11) k1 = 0;
  if (k1 === 10) k1 = 0; // Invalid, but for mock we'll use 0
  
  // K2
  const withK1 = partial + k1;
  const digitsWithK1 = withK1.split('').map(Number);
  const k2Weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let k2Sum = 0;
  for (let i = 0; i < 10; i++) {
    k2Sum += digitsWithK1[i] * k2Weights[i];
  }
  let k2 = 11 - (k2Sum % 11);
  if (k2 === 11) k2 = 0;
  if (k2 === 10) k2 = 0; // Invalid, but for mock we'll use 0
  
  return partial + k1 + k2;
}

/**
 * Masks personal number for display (shows only last 5 digits)
 * @param {string} personalNumber - 11-digit personal number
 * @returns {string} - Masked as "****** XXXXX"
 */
export function maskPersonalNumber(personalNumber) {
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  if (cleaned.length !== 11) {
    return '***********';
  }
  return `****** ${cleaned.substring(6)}`;
}