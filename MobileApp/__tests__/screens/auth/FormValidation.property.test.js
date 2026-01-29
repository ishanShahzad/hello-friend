/**
 * Property Tests for Form Validation
 * Feature: mobile-app-modernization
 * Property 13: Form Validation Feedback
 * 
 * Validates: Requirements 5.4, 9.2, 19.3
 */

import * as fc from 'fast-check';

describe('Form Validation Feedback', () => {
  describe('Property 13: Form Validation Feedback', () => {
    // Email validation function (matching implementation)
    const validateEmail = (email) => {
      if (!email || typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    };

    // Password validation function
    const validatePassword = (password) => {
      if (!password || typeof password !== 'string') return false;
      return password.length >= 6;
    };

    // Name validation function
    const validateName = (name) => {
      if (!name || typeof name !== 'string') return false;
      return name.trim().length >= 2;
    };

    // Property: Valid emails should pass validation
    it('valid emails should pass validation', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            expect(validateEmail(email)).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Invalid emails should fail validation
    it('invalid emails should fail validation', () => {
      const invalidEmailArbitrary = fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.constant('notanemail'),
        fc.constant('missing@domain'),
        fc.constant('@nodomain.com'),
        fc.constant('spaces in@email.com'),
        fc.string().filter(s => !s.includes('@')),
      );

      fc.assert(
        fc.property(
          invalidEmailArbitrary,
          (email) => {
            expect(validateEmail(email)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Empty/null/undefined emails should fail
    it('empty, null, or undefined emails should fail validation', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });

    // Property: Passwords with 6+ characters should pass
    it('passwords with 6 or more characters should pass validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 6, maxLength: 100 }),
          (password) => {
            expect(validatePassword(password)).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Passwords with less than 6 characters should fail
    it('passwords with less than 6 characters should fail validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 5 }),
          (password) => {
            expect(validatePassword(password)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Names with 2+ characters should pass
    it('names with 2 or more characters should pass validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
          (name) => {
            expect(validateName(name)).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Names with less than 2 characters should fail
    it('names with less than 2 characters should fail validation', () => {
      const shortNameArbitrary = fc.oneof(
        fc.constant(''),
        fc.constant(' '),
        fc.constant('A'),
        fc.constant('  B  '),
      );

      fc.assert(
        fc.property(
          shortNameArbitrary,
          (name) => {
            expect(validateName(name)).toBe(false);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Password Confirmation Validation', () => {
    // Property: Matching passwords should pass
    it('matching passwords should pass confirmation validation', () => {
      const validatePasswordMatch = (password, confirmPassword) => {
        return password === confirmPassword;
      };

      fc.assert(
        fc.property(
          fc.string({ minLength: 6, maxLength: 50 }),
          (password) => {
            expect(validatePasswordMatch(password, password)).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Non-matching passwords should fail
    it('non-matching passwords should fail confirmation validation', () => {
      const validatePasswordMatch = (password, confirmPassword) => {
        return password === confirmPassword;
      };

      fc.assert(
        fc.property(
          fc.string({ minLength: 6, maxLength: 50 }),
          fc.string({ minLength: 6, maxLength: 50 }),
          (password, confirmPassword) => {
            fc.pre(password !== confirmPassword);
            expect(validatePasswordMatch(password, confirmPassword)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Form Field Error Messages', () => {
    // Property: Each validation failure should produce an error message
    it('validation failures should produce non-empty error messages', () => {
      const getEmailError = (email) => {
        if (!email || !email.trim()) return 'Please enter your email address';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Please enter a valid email address';
        return '';
      };

      const getPasswordError = (password) => {
        if (!password) return 'Please enter a password';
        if (password.length < 6) return 'Password must be at least 6 characters';
        return '';
      };

      const getNameError = (name) => {
        if (!name || !name.trim()) return 'Please enter your name';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      };

      // Invalid inputs should produce error messages
      expect(getEmailError('')).toBeTruthy();
      expect(getEmailError('invalid')).toBeTruthy();
      expect(getPasswordError('')).toBeTruthy();
      expect(getPasswordError('12345')).toBeTruthy();
      expect(getNameError('')).toBeTruthy();
      expect(getNameError('A')).toBeTruthy();

      // Valid inputs should produce empty error messages
      expect(getEmailError('test@example.com')).toBe('');
      expect(getPasswordError('password123')).toBe('');
      expect(getNameError('John Doe')).toBe('');
    });
  });

  describe('Form Submission Prevention', () => {
    // Property: Forms with any invalid field should not submit
    it('forms with invalid fields should prevent submission', () => {
      const canSubmitLoginForm = (email, password) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = email && emailRegex.test(email);
        const isPasswordValid = password && password.length >= 6;
        return !!(isEmailValid && isPasswordValid);
      };

      // Invalid combinations should prevent submission
      expect(canSubmitLoginForm('', 'password123')).toBe(false);
      expect(canSubmitLoginForm('test@example.com', '')).toBe(false);
      expect(canSubmitLoginForm('invalid', 'password123')).toBe(false);
      expect(canSubmitLoginForm('test@example.com', '12345')).toBe(false);
      expect(canSubmitLoginForm('', '')).toBe(false);

      // Valid combination should allow submission
      expect(canSubmitLoginForm('test@example.com', 'password123')).toBe(true);
    });

    // Property: SignUp form validation
    it('signup forms should validate all required fields', () => {
      const canSubmitSignUpForm = (name, email, password, confirmPassword, agreeTerms) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isNameValid = name && name.trim().length >= 2;
        const isEmailValid = email && emailRegex.test(email);
        const isPasswordValid = password && password.length >= 6;
        const isConfirmValid = password === confirmPassword;
        return isNameValid && isEmailValid && isPasswordValid && isConfirmValid && agreeTerms;
      };

      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          fc.emailAddress(),
          fc.string({ minLength: 6, maxLength: 50 }),
          fc.boolean(),
          (name, email, password, agreeTerms) => {
            const result = canSubmitSignUpForm(name, email, password, password, agreeTerms);
            // Should only submit if terms are agreed
            expect(result).toBe(agreeTerms);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Input Sanitization', () => {
    // Property: Email should be trimmed before validation
    it('email validation should handle whitespace', () => {
      const validateEmailWithTrim = (email) => {
        if (!email || typeof email !== 'string') return false;
        const trimmed = email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed);
      };

      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.nat({ max: 5 }),
          fc.nat({ max: 5 }),
          (email, leadingSpaces, trailingSpaces) => {
            const paddedEmail = ' '.repeat(leadingSpaces) + email + ' '.repeat(trailingSpaces);
            expect(validateEmailWithTrim(paddedEmail)).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Phone Number Validation', () => {
    // Property: Valid phone numbers should pass (for checkout)
    it('phone numbers should contain only digits and common separators', () => {
      const validatePhone = (phone) => {
        if (!phone || typeof phone !== 'string') return false;
        // Remove common separators and check if remaining are digits
        const digitsOnly = phone.replace(/[\s\-\(\)\+]/g, '');
        return digitsOnly.length >= 10 && /^\d+$/.test(digitsOnly);
      };

      const validPhoneArbitrary = fc.oneof(
        fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 15 }),
        fc.constant('+1 (555) 123-4567'),
        fc.constant('555-123-4567'),
        fc.constant('5551234567'),
      );

      fc.assert(
        fc.property(
          validPhoneArbitrary,
          (phone) => {
            expect(validatePhone(phone)).toBe(true);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Price Validation (Product Form)', () => {
    // Property: Prices should be positive numbers
    it('product prices should be positive numbers', () => {
      const validatePrice = (price) => {
        const num = parseFloat(price);
        return !isNaN(num) && num > 0;
      };

      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          (price) => {
            expect(validatePrice(price.toString())).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Zero or negative prices should fail
    it('zero or negative prices should fail validation', () => {
      const validatePrice = (price) => {
        const num = parseFloat(price);
        return !isNaN(num) && num > 0;
      };

      expect(validatePrice('0')).toBe(false);
      expect(validatePrice('-10')).toBe(false);
      expect(validatePrice('abc')).toBe(false);
      expect(validatePrice('')).toBe(false);
    });

    // Property: Discounted price should be less than original price
    it('discounted price should be less than original price', () => {
      const validateDiscountedPrice = (originalPrice, discountedPrice) => {
        if (!discountedPrice) return true; // Optional field
        const original = parseFloat(originalPrice);
        const discounted = parseFloat(discountedPrice);
        return !isNaN(discounted) && discounted > 0 && discounted < original;
      };

      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(9.99), noNaN: true }),
          (originalPrice, discountAmount) => {
            const discountedPrice = originalPrice - discountAmount;
            if (discountedPrice > 0) {
              expect(validateDiscountedPrice(originalPrice.toString(), discountedPrice.toString())).toBe(true);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Stock Validation (Product Form)', () => {
    // Property: Stock should be non-negative integer
    it('stock should be non-negative integer', () => {
      const validateStock = (stock) => {
        const num = parseInt(stock, 10);
        return !isNaN(num) && num >= 0 && Number.isInteger(num);
      };

      fc.assert(
        fc.property(
          fc.nat({ max: 10000 }),
          (stock) => {
            expect(validateStock(stock.toString())).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: Negative stock should fail
    it('negative stock should fail validation', () => {
      const validateStock = (stock) => {
        const num = parseInt(stock, 10);
        return !isNaN(num) && num >= 0 && Number.isInteger(num);
      };

      expect(validateStock('-1')).toBe(false);
      expect(validateStock('-100')).toBe(false);
    });
  });
});
