import * as Sentry from '@sentry/react';

import { useSettingsStore } from '../stores/settingsStore';

/**
 * Report an error to Sentry with context
 * 
 * @param error Error object or string message
 * @param context Additional context information
 * @returns User-friendly error message
 */
export function reportError(error: Error | string, context?: Record<string, any>): string {
  // Create an error object if a string was passed
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  // Always log to console regardless of environment
  console.error('Error:', errorObj, context);
  
  // Only send to Sentry in production AND if user has opted in
  if (import.meta.env.SENTRY_DSN) {
    const errorReportingEnabled = useSettingsStore.getState().errorReportingEnabled;
    
    if (errorReportingEnabled) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
        Sentry.captureException(errorObj);
      });
    }
  }
  
  // Return user-friendly message based on error type
  return getUserFriendlyMessage(errorObj);
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
