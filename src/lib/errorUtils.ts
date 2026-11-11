// Centralized, user-friendly error sanitization utility

const SENSITIVE_DB_PATTERNS = [
  /syntax error/i,
  /permission denied/i,
  /violates foreign key/i,
  /violates unique constraint/i,
  /relation ".*" does not exist/i,
  /column ".*" does not exist/i,
  /jwt expired/i,
  /invalid input syntax for type uuid/i,
  /p_attempt_id/i,
  /null value in column/i,
  /pg_/i,
  /supabase/i,
];

export function sanitizeErrorMessage(error: unknown, fallbackMessage: string = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallbackMessage;

  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : fallbackMessage;

  // Check if error contains raw database stack traces or keywords
  for (const pattern of SENSITIVE_DB_PATTERNS) {
    if (pattern.test(rawMessage)) {
      if (/violates unique constraint/i.test(rawMessage)) {
        return 'A record with this information already exists.';
      }
      if (/permission denied/i.test(rawMessage) || /unauthorized/i.test(rawMessage)) {
        return 'You do not have permission to perform this action.';
      }
      if (/jwt expired/i.test(rawMessage)) {
        return 'Your session has expired. Please sign in again.';
      }
      if (/invalid input syntax for type uuid/i.test(rawMessage)) {
        return 'Invalid identifier provided.';
      }
      return fallbackMessage;
    }
  }

  // If message is clean and user-facing, return it
  if (
    /signups not allowed for otp/i.test(rawMessage) ||
    /otp_disabled/i.test(rawMessage) ||
    /signup_disabled/i.test(rawMessage)
  ) {
    return 'This faculty account is provisioned for Password Login. Please sign in using the Password Login tab with your administrator-assigned credentials.';
  }

  if (rawMessage.length > 0 && rawMessage.length < 200 && !rawMessage.includes('SELECT') && !rawMessage.includes('INSERT') && !rawMessage.includes('UPDATE')) {
    return rawMessage;
  }

  return fallbackMessage;
}

