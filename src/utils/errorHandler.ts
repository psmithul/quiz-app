import { AuthError } from '@supabase/supabase-js';

// Custom error types
export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export type FormError = {
  field: string;
  message: string;
};

// Function to handle API errors
export function handleApiError(error: unknown): ApiError {
  if (error instanceof AuthError) {
    return {
      status: 401,
      message: error.message,
    };
  }
  
  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
    };
  }
  
  return {
    status: 500,
    message: 'An unexpected error occurred',
    details: error,
  };
}

// Function to validate form input
export function validateFormInput(input: Record<string, unknown>): FormError[] {
  const errors: FormError[] = [];
  
  // Example validation - expand as needed
  Object.entries(input).forEach(([field, value]) => {
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  });
  
  return errors;
}

// Create user-friendly error message
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
} 