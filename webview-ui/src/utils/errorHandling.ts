/**
 * Enhanced error handling utilities for MCP components
 */

/**
 * Enhanced error formatting function for RTK Query and general errors
 */
export function formatError(error: any): string {
	if (!error) return "Unknown error occurred"

	// Handle RTK Query errors
	if (typeof error === "object") {
		// FetchBaseQueryError
		if ("status" in error) {
			const status = error.status
			const data = error.data

			if (status === "FETCH_ERROR") {
				return "Network connection failed. Please check your internet connection."
			}
			if (status === "PARSING_ERROR") {
				return "Failed to parse server response. The server may be experiencing issues."
			}
			if (status === "TIMEOUT_ERROR") {
				return "Request timed out. Please try again."
			}
			if (typeof status === "number") {
				switch (status) {
					case 400:
						return "Bad request. Please check your configuration."
					case 401:
						return "Authentication failed. Please check your credentials."
					case 403:
						return "Access forbidden. You may not have permission to access this resource."
					case 404:
						return "Resource not found. The service may be unavailable."
					case 429:
						return "Too many requests. Please wait a moment before trying again."
					case 500:
						return "Internal server error. Please try again later."
					case 502:
						return "Bad gateway. The server is temporarily unavailable."
					case 503:
						return "Service unavailable. Please try again later."
					case 504:
						return "Gateway timeout. The server took too long to respond."
					default:
						return `HTTP ${status}: ${data ? JSON.stringify(data) : "Server error"}`
				}
			}
			return `Request failed with status: ${status}`
		}

		// SerializedError
		if ("message" in error) {
			return error.message || "An error occurred"
		}

		// Generic object error
		try {
			return JSON.stringify(error)
		} catch {
			return "An unknown error occurred"
		}
	}

	// String error
	if (typeof error === "string") {
		return error
	}

	return "An unexpected error occurred"
}

/**
 * Get user-friendly error title based on error type
 */
export function getErrorTitle(error: any): string {
	if (!error) return "Error"

	if (typeof error === "object" && "status" in error) {
		const status = error.status

		if (status === "FETCH_ERROR") return "Connection Error"
		if (status === "PARSING_ERROR") return "Data Error"
		if (status === "TIMEOUT_ERROR") return "Timeout Error"

		if (typeof status === "number") {
			if (status >= 400 && status < 500) return "Client Error"
			if (status >= 500) return "Server Error"
		}
	}

	return "Error"
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
	if (!error) return true

	if (typeof error === "object" && "status" in error) {
		const status = error.status

		// Network errors are retryable
		if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") return true

		if (typeof status === "number") {
			// Client errors (except 401, 403, 404) are generally not retryable
			if (status >= 400 && status < 500) {
				return ![401, 403, 404].includes(status)
			}
			// Server errors are retryable
			if (status >= 500) return true
		}
	}

	return true
}

/**
 * Safe conversion wrapper with error logging
 */
export function safeConvert<T, R>(data: T | null | undefined, converter: (data: T) => R, fallback: R, context: string): R {
	if (!data) {
		console.warn(`${context}: Attempted to convert null/undefined data`)
		return fallback
	}

	try {
		return converter(data)
	} catch (error) {
		console.error(`${context}: Conversion failed:`, error, data)
		return fallback
	}
}
