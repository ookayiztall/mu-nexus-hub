/**
 * Shared error formatter for Supabase Edge Function errors
 * Converts technical errors into user-friendly messages
 */

export interface EdgeFunctionError {
  message: string;
  code?: string;
  isNetworkError: boolean;
  isConfigurationError: boolean;
  statusCode?: number;
}

// Map of error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  // Authentication errors
  UNAUTHORIZED: "Please sign in to continue.",
  INVALID_AUTH: "Your session has expired. Please sign in again.",
  SESSION_MISMATCH: "This action is not authorized for your account.",
  
  // Configuration errors
  STRIPE_NOT_CONFIGURED: "Card payments are currently unavailable. Please try again later.",
  PAYPAL_NOT_CONFIGURED: "PayPal payments are currently unavailable.",
  
  // Validation errors
  INVALID_PACKAGE_ID: "The selected package is no longer available.",
  INVALID_LISTING_ID: "This listing is no longer available.",
  MISSING_REQUIRED_FIELD: "Please fill in all required fields.",
  
  // Session/Setup errors
  SESSION_NOT_FOUND: "The payment session could not be found.",
  SETUP_INCOMPLETE: "The card setup was not completed.",
  NO_PAYMENT_METHOD: "No payment method was provided.",
  SAVE_FAILED: "Failed to save your payment method. Please try again.",
  
  // General errors
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
};

// Map HTTP status codes to user-friendly messages
const statusMessages: Record<number, string> = {
  400: "The request was invalid. Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again later.",
  502: "Service temporarily unavailable. Please try again.",
  503: "Service is currently unavailable. Please try again later.",
  504: "The request timed out. Please try again.",
};

/**
 * Formats an edge function error into a user-friendly message
 */
export function formatEdgeFunctionError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred. Please try again."
): EdgeFunctionError {
  // Handle network/CORS errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      message: "Unable to connect to payment services. Please check your internet connection.",
      isNetworkError: true,
      isConfigurationError: false,
    };
  }

  // Handle Supabase function invoke errors
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    
    // Check for CORS or network issues
    if (err.name === "FunctionsHttpError" || err.name === "FunctionsRelayError") {
      return {
        message: "Payment services are temporarily unavailable. Please try again later.",
        isNetworkError: true,
        isConfigurationError: false,
      };
    }

    // Check for structured error response
    if (err.message && typeof err.message === "string") {
      // Try to parse JSON error from message
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          const code = parsed.code as string | undefined;
          const userMessage = code && errorMessages[code] 
            ? errorMessages[code] 
            : parsed.error;
          
          return {
            message: userMessage,
            code,
            isNetworkError: false,
            isConfigurationError: !!parsed.needsConfiguration,
            statusCode: parsed.statusCode,
          };
        }
      } catch {
        // Not JSON, use message as-is
      }

      // Check for known error codes in message
      for (const [code, message] of Object.entries(errorMessages)) {
        if (err.message.includes(code)) {
          return {
            message,
            code,
            isNetworkError: false,
            isConfigurationError: code.includes("NOT_CONFIGURED"),
          };
        }
      }

      return {
        message: err.message,
        isNetworkError: false,
        isConfigurationError: false,
      };
    }

    // Check for status code
    if (typeof err.status === "number") {
      const statusCode = err.status;
      const message = statusMessages[statusCode] || fallbackMessage;
      
      return {
        message,
        statusCode,
        isNetworkError: statusCode >= 502 && statusCode <= 504,
        isConfigurationError: false,
      };
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.toLowerCase().includes("network")) {
      return {
        message: "Network error. Please check your connection and try again.",
        isNetworkError: true,
        isConfigurationError: false,
      };
    }

    if (error.message.toLowerCase().includes("cors")) {
      return {
        message: "Unable to connect to payment services. Please try again.",
        isNetworkError: true,
        isConfigurationError: false,
      };
    }

    return {
      message: error.message || fallbackMessage,
      isNetworkError: false,
      isConfigurationError: false,
    };
  }

  return {
    message: fallbackMessage,
    isNetworkError: false,
    isConfigurationError: false,
  };
}

/**
 * Formats an edge function response error
 */
export function formatResponseError(
  response: { error?: unknown; data?: { error?: string; code?: string; needsConfiguration?: boolean } },
  fallbackMessage = "An unexpected error occurred"
): EdgeFunctionError {
  // Check for invoke-level error
  if (response.error) {
    return formatEdgeFunctionError(response.error, fallbackMessage);
  }

  // Check for structured error in data
  if (response.data?.error) {
    const code = response.data.code;
    const userMessage = code && errorMessages[code] 
      ? errorMessages[code] 
      : response.data.error;

    return {
      message: userMessage,
      code,
      isNetworkError: false,
      isConfigurationError: !!response.data.needsConfiguration,
    };
  }

  return {
    message: fallbackMessage,
    isNetworkError: false,
    isConfigurationError: false,
  };
}

/**
 * Gets a user-friendly message for common payment states
 */
export function getPaymentUnavailableMessage(provider: "stripe" | "paypal"): string {
  if (provider === "stripe") {
    return "Card payments are currently being configured. Please try again later or use an alternative payment method.";
  }
  return "PayPal payments are currently being configured. Please try again later or use an alternative payment method.";
}
