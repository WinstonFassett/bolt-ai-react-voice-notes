import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry error reporting
 * 
 * @param dsn Your Sentry project DSN (get this from Sentry dashboard)
 */
export function initErrorReporting(dsn?: string) {
  // Don't initialize if no DSN is provided
  if (!dsn) {
    console.warn('Sentry DSN not provided, error reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [new BrowserTracing()],
    
    // Set tracesSampleRate to 0.5 to capture 50% of transactions for performance monitoring
    // Adjust based on your traffic volume
    tracesSampleRate: 0.5,
    
    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',
    
    // Capture user info but respect privacy
    beforeSend(event) {
      // Don't send personal data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    }
  });
}

/**
 * Report an error to Sentry with context
 * 
 * @param error The error object
 * @param context Additional context information
 * @returns User-friendly error message
 */
export function reportError(error: Error, context?: Record<string, any>): string {
  console.error('Error:', error, context);
  
  // Send to Sentry if available
  if (Sentry.getCurrentHub().getClient()) {
    Sentry.captureException(error, {
      extra: context
    });
  }
  
  // Return user-friendly message based on error type
  return getUserFriendlyMessage(error);
}

/**
 * Set the user ID for error reporting
 * 
 * @param id Anonymous user ID
 */
export function setErrorReportingUser(id: string) {
  Sentry.setUser({ id });
}

/**
 * Map technical errors to user-friendly messages
 */
function getUserFriendlyMessage(error: Error): string {
  // Memory errors
  if (
    error.message.includes('memory') || 
    error.message.includes('allocation failed') ||
    error.message.includes('quota exceeded')
  ) {
    return "Your recording is quite large and couldn't be processed. Try breaking it into smaller recordings or using the optimization feature.";
  }
  
  // Network errors
  if (
    error.message.includes('network') || 
    error.message.includes('fetch') ||
    error.message.includes('offline')
  ) {
    return "Connection issue. Please check your internet and try again.";
  }
  
  // Audio processing errors
  if (
    error.message.includes('audio') || 
    error.message.includes('decode') ||
    error.message.includes('media')
  ) {
    return "There was a problem processing your audio. The file may be corrupted or in an unsupported format.";
  }
  
  // Transcription errors
  if (
    error.message.includes('transcription') || 
    error.message.includes('whisper') ||
    error.message.includes('model')
  ) {
    return "Transcription failed. Try with a shorter recording or different transcription method.";
  }
  
  // Default message
  return "Something went wrong. We've logged the issue and are working on it.";
}
