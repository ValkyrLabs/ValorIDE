import { serializeError } from "serialize-error";

/**
 * Utility functions for error handling and formatting
 */
export class ErrorHandlingUtils {
  /**
   * Format error with status code if available
   */
  static formatErrorWithStatusCode(error: any): string {
    const statusCode =
      error.status ||
      error.statusCode ||
      (error.response && error.response.status);
    const message =
      error.message ?? JSON.stringify(serializeError(error), null, 2);

    // Only prepend the statusCode if it's not already part of the message
    return statusCode && !message.includes(statusCode.toString())
      ? `${statusCode} - ${message}`
      : message;
  }

  /**
   * Create a standardized error string for tool operations
   */
  static formatToolError(action: string, error: Error): string {
    return `Error ${action}: ${JSON.stringify(serializeError(error))}`;
  }

  /**
   * Create a user-friendly error message for tool operations
   */
  static formatToolErrorMessage(action: string, error: Error): string {
    return `Error ${action}:\n${error.message ?? JSON.stringify(serializeError(error), null, 2)}`;
  }
}
