/*
 * Logging and Error Handling Utilities for AI Document Review Add-in
 * Provides comprehensive logging, error tracking, and debugging capabilities
 */

/**
 * Log levels for different types of messages
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Logger class for structured logging
 */
class Logger {
  constructor(component = "AIDocumentReview") {
    this.component = component;
    this.logLevel = LogLevel.INFO; // Default log level
    this.logs = []; // Store logs for debugging
    this.maxLogs = 100; // Maximum number of logs to keep
  }

  /**
   * Set the current log level
   * @param {number} level - Log level
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * Create a formatted log entry
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @returns {Object} - Formatted log entry
   */
  createLogEntry(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      component: this.component,
      level: Object.keys(LogLevel)[level],
      message,
      data,
    };

    // Store log for debugging
    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return entry;
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {any} data - Additional data
   */
  debug(message, data = null) {
    if (this.logLevel <= LogLevel.DEBUG) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, data);
      console.debug(`🔍 [${entry.timestamp}] ${this.component}: ${message}`, data || "");
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} data - Additional data
   */
  info(message, data = null) {
    if (this.logLevel <= LogLevel.INFO) {
      const entry = this.createLogEntry(LogLevel.INFO, message, data);
      console.log(`ℹ️ [${entry.timestamp}] ${this.component}: ${message}`, data || "");
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} data - Additional data
   */
  warn(message, data = null) {
    if (this.logLevel <= LogLevel.WARN) {
      const entry = this.createLogEntry(LogLevel.WARN, message, data);
      console.warn(`⚠️ [${entry.timestamp}] ${this.component}: ${message}`, data || "");
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {any} data - Additional data
   */
  error(message, data = null) {
    if (this.logLevel <= LogLevel.ERROR) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, data);
      console.error(`❌ [${entry.timestamp}] ${this.component}: ${message}`, data || "");
    }
  }

  /**
   * Get recent logs for debugging
   * @param {number} count - Number of recent logs to return
   * @returns {Array} - Recent log entries
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as formatted string
   * @returns {string} - Formatted log output
   */
  exportLogs() {
    return this.logs
      .map(
        (entry) =>
          `[${entry.timestamp}] ${entry.level} - ${entry.component}: ${entry.message}` +
          (entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : "")
      )
      .join("\n");
  }
}

/**
 * Error Handler class for consistent error management
 */
class ErrorHandler {
  constructor(logger) {
    this.logger = logger || new Logger("ErrorHandler");
    this.errorCounts = new Map(); // Track error frequencies
    this.maxRetries = 3;
  }

  /**
   * Handle and categorize errors
   * @param {Error} error - Error to handle
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional error metadata
   * @returns {Object} - Processed error information
   */
  handleError(error, context = "Unknown", metadata = {}) {
    const errorInfo = {
      message: error.message || "Unknown error",
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      metadata,
      category: this.categorizeError(error),
      severity: this.determineSeverity(error),
      userMessage: this.getUserFriendlyMessage(error, context),
    };

    // Track error frequency
    const errorKey = `${context}:${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log the error
    this.logger.error(`Error in ${context}: ${error.message}`, {
      category: errorInfo.category,
      severity: errorInfo.severity,
      count: this.errorCounts.get(errorKey),
      metadata,
    });

    return errorInfo;
  }

  /**
   * Categorize error types
   * @param {Error} error - Error to categorize
   * @returns {string} - Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection")
    ) {
      return "NETWORK";
    }
    if (
      message.includes("api") ||
      message.includes("401") ||
      message.includes("403") ||
      message.includes("key")
    ) {
      return "API_AUTH";
    }
    if (message.includes("parse") || message.includes("json") || message.includes("syntax")) {
      return "DATA_FORMAT";
    }
    if (message.includes("timeout") || message.includes("abort")) {
      return "TIMEOUT";
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return "RATE_LIMIT";
    }
    if (message.includes("document") || message.includes("word") || message.includes("paragraph")) {
      return "DOCUMENT";
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return "VALIDATION";
    }

    return "GENERAL";
  }

  /**
   * Determine error severity
   * @param {Error} error - Error to evaluate
   * @returns {string} - Severity level
   */
  determineSeverity(error) {
    const category = this.categorizeError(error);
    const message = error.message.toLowerCase();

    if (category === "API_AUTH" || message.includes("unauthorized")) {
      return "HIGH";
    }
    if (category === "NETWORK" || category === "TIMEOUT") {
      return "MEDIUM";
    }
    if (category === "DATA_FORMAT" || category === "VALIDATION") {
      return "LOW";
    }

    return "MEDIUM";
  }

  /**
   * Generate user-friendly error messages
   * @param {Error} error - Original error
   * @param {string} context - Error context
   * @returns {string} - User-friendly message
   */
  getUserFriendlyMessage(error, context) {
    const category = this.categorizeError(error);

    switch (category) {
      case "NETWORK":
        return "Unable to connect to the AI service. Please check your internet connection and try again.";
      case "API_AUTH":
        return "Authentication failed. Please check your API configuration.";
      case "DATA_FORMAT":
        return "Received unexpected data format. The analysis may need to be retried.";
      case "TIMEOUT":
        return "The operation took too long to complete. Please try again with a smaller document.";
      case "RATE_LIMIT":
        return "Too many requests. Please wait a moment before trying again.";
      case "DOCUMENT":
        return "There was an issue processing your document. Please ensure it contains readable text.";
      case "VALIDATION":
        return "The document or request contains invalid data. Please check your input.";
      default:
        return "An unexpected error occurred. Please try again or contact support if the problem persists.";
    }
  }

  /**
   * Check if an error should trigger a retry
   * @param {Error} error - Error to evaluate
   * @param {number} attemptCount - Current attempt number
   * @returns {boolean} - Whether to retry
   */
  shouldRetry(error, attemptCount = 1) {
    if (attemptCount >= this.maxRetries) {
      return false;
    }

    const category = this.categorizeError(error);
    const retryableCategories = ["NETWORK", "TIMEOUT", "RATE_LIMIT"];

    return retryableCategories.includes(category);
  }

  /**
   * Get error statistics
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      errorsByCategory: {},
      mostFrequentErrors: [],
      errorCounts: Object.fromEntries(this.errorCounts),
    };

    for (const [key, count] of this.errorCounts) {
      stats.totalErrors += count;
      const category = key.split(":")[0];
      stats.errorsByCategory[category] = (stats.errorsByCategory[category] || 0) + count;
    }

    stats.mostFrequentErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return stats;
  }

  /**
   * Clear error tracking data
   */
  clearErrorStats() {
    this.errorCounts.clear();
  }
}

/**
 * Performance Monitor for tracking operation performance
 */
class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger || new Logger("PerformanceMonitor");
    this.metrics = new Map();
    this.thresholds = {
      documentAnalysis: 10000, // 10 seconds
      suggestionApplication: 5000, // 5 seconds
      documentExtraction: 2000, // 2 seconds
    };
  }

  /**
   * Start tracking an operation
   * @param {string} operationName - Name of the operation
   * @param {Object} metadata - Additional metadata
   * @returns {string} - Operation ID for tracking
   */
  startOperation(operationName, metadata = {}) {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.metrics.set(operationId, {
      name: operationName,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      metadata,
      status: "RUNNING",
    });

    this.logger.debug(`Started operation: ${operationName}`, { operationId, metadata });
    return operationId;
  }

  /**
   * End tracking an operation
   * @param {string} operationId - Operation ID
   * @param {string} status - Operation status ('SUCCESS' or 'ERROR')
   * @param {Object} result - Operation result metadata
   */
  endOperation(operationId, status = "SUCCESS", result = {}) {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      this.logger.warn(`Operation ${operationId} not found for ending`);
      return;
    }

    const endTime = Date.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = status;
    metric.result = result;

    // Check if operation exceeded threshold
    const threshold = this.thresholds[metric.name];
    if (threshold && metric.duration > threshold) {
      this.logger.warn(`Operation ${metric.name} exceeded threshold`, {
        operationId,
        duration: metric.duration,
        threshold,
        status,
      });
    } else {
      this.logger.debug(`Completed operation: ${metric.name}`, {
        operationId,
        duration: metric.duration,
        status,
      });
    }
  }

  /**
   * Get performance statistics
   * @param {string} operationName - Optional filter by operation name
   * @returns {Object} - Performance statistics
   */
  getStats(operationName = null) {
    const relevantMetrics = Array.from(this.metrics.values())
      .filter((metric) => !operationName || metric.name === operationName)
      .filter((metric) => metric.status !== "RUNNING");

    if (relevantMetrics.length === 0) {
      return { count: 0, averageDuration: 0, successRate: 0 };
    }

    const durations = relevantMetrics.map((m) => m.duration);
    const successCount = relevantMetrics.filter((m) => m.status === "SUCCESS").length;

    return {
      count: relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / relevantMetrics.length) * 100,
      operationName: operationName || "ALL",
    };
  }

  /**
   * Clear old metrics to prevent memory leaks
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupOldMetrics(maxAge = 3600000) {
    // 1 hour default
    const cutoff = Date.now() - maxAge;

    for (const [id, metric] of this.metrics) {
      if (metric.startTime < cutoff) {
        this.metrics.delete(id);
      }
    }
  }
}

// Global instances
const globalLogger = new Logger("Global");
const globalErrorHandler = new ErrorHandler(globalLogger);
const globalPerformanceMonitor = new PerformanceMonitor(globalLogger);

// Set debug mode if in development
if (typeof window !== "undefined" && window.location && window.location.hostname === "localhost") {
  globalLogger.setLogLevel(LogLevel.DEBUG);
}

// Export utilities
if (typeof window !== "undefined") {
  window.Logger = Logger;
  window.ErrorHandler = ErrorHandler;
  window.PerformanceMonitor = PerformanceMonitor;
  window.globalLogger = globalLogger;
  window.globalErrorHandler = globalErrorHandler;
  window.globalPerformanceMonitor = globalPerformanceMonitor;
}

export {
  Logger,
  ErrorHandler,
  PerformanceMonitor,
  LogLevel,
  globalLogger,
  globalErrorHandler,
  globalPerformanceMonitor,
};
