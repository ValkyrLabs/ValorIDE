export const DEFAULT_FILE_PROCESSING_CONFIG = {
    maxFileSize: 512000, // 500KB
    chunkSize: 5120, // 5KB
    streamingDelay: 16, // 60fps
    enableProgressiveLoading: true,
    warnLargeFiles: true,
    largeFileThreshold: 20480, // 20KB
};
export const DEFAULT_BUDGET_ALERT_CONFIG = {
    depletedThreshold: 0,
    criticalThreshold: 1,
    lowThreshold: 5,
    alertThreshold: 10,
};
export const DEFAULT_MATCHING_CONFIG = {
    enableFuzzyMatching: true,
    fuzzyThreshold: 0.8,
    maxSearchAttempts: 3,
    enableContextualMatching: true,
    enableWhitespaceNormalization: true,
    enableSemanticMatching: false,
};
export const DEFAULT_OUTPUT_FILTER_CONFIG = {
    maxOutputLength: 5000,
    enableSmartSummarization: true,
    verbosityLevel: 'normal',
    enableProgressFiltering: true,
    enableStackTraceFiltering: true,
    customPatterns: [],
    enableCommandSpecificFiltering: true,
};
export const DEFAULT_PERFORMANCE_CONFIG = {
    enableParallelProcessing: true,
    maxConcurrentOperations: 3,
    memoryLimit: 100, // MB
    enableProgressiveLoading: true,
    enableBackgroundPreprocessing: false,
};
export const DEFAULT_DEBUGGING_CONFIG = {
    enableVerboseLogging: false,
    saveFailedMatches: false,
    enablePerformanceMetrics: false,
    logOutputFiltering: false,
    showPsrResultsReport: false,
};
export const DEFAULT_THORAPI_CONFIG = {
    outputFolder: "thorapi",
};
export const DEFAULT_ADVANCED_SETTINGS = {
    version: 1,
    fileProcessing: DEFAULT_FILE_PROCESSING_CONFIG,
    matching: DEFAULT_MATCHING_CONFIG,
    outputFilter: DEFAULT_OUTPUT_FILTER_CONFIG,
    performance: DEFAULT_PERFORMANCE_CONFIG,
    debugging: DEFAULT_DEBUGGING_CONFIG,
    budgetAlerts: DEFAULT_BUDGET_ALERT_CONFIG,
    thorapi: DEFAULT_THORAPI_CONFIG,
};
// Validation functions
export function validateFileProcessingConfig(config) {
    return {
        maxFileSize: Math.max(1024, config.maxFileSize ?? DEFAULT_FILE_PROCESSING_CONFIG.maxFileSize),
        chunkSize: Math.max(512, Math.min(config.chunkSize ?? DEFAULT_FILE_PROCESSING_CONFIG.chunkSize, 10240)),
        streamingDelay: Math.max(1, Math.min(config.streamingDelay ?? DEFAULT_FILE_PROCESSING_CONFIG.streamingDelay, 100)),
        enableProgressiveLoading: config.enableProgressiveLoading ?? DEFAULT_FILE_PROCESSING_CONFIG.enableProgressiveLoading,
        warnLargeFiles: config.warnLargeFiles ?? DEFAULT_FILE_PROCESSING_CONFIG.warnLargeFiles,
        largeFileThreshold: Math.max(1024, config.largeFileThreshold ?? DEFAULT_FILE_PROCESSING_CONFIG.largeFileThreshold),
    };
}
export function validateMatchingConfig(config) {
    return {
        enableFuzzyMatching: config.enableFuzzyMatching ?? DEFAULT_MATCHING_CONFIG.enableFuzzyMatching,
        fuzzyThreshold: Math.max(0.1, Math.min(config.fuzzyThreshold ?? DEFAULT_MATCHING_CONFIG.fuzzyThreshold, 1.0)),
        maxSearchAttempts: Math.max(1, Math.min(config.maxSearchAttempts ?? DEFAULT_MATCHING_CONFIG.maxSearchAttempts, 10)),
        enableContextualMatching: config.enableContextualMatching ?? DEFAULT_MATCHING_CONFIG.enableContextualMatching,
        enableWhitespaceNormalization: config.enableWhitespaceNormalization ?? DEFAULT_MATCHING_CONFIG.enableWhitespaceNormalization,
        enableSemanticMatching: config.enableSemanticMatching ?? DEFAULT_MATCHING_CONFIG.enableSemanticMatching,
    };
}
export function validateOutputFilterConfig(config) {
    return {
        maxOutputLength: Math.max(100, config.maxOutputLength ?? DEFAULT_OUTPUT_FILTER_CONFIG.maxOutputLength),
        enableSmartSummarization: config.enableSmartSummarization ?? DEFAULT_OUTPUT_FILTER_CONFIG.enableSmartSummarization,
        verbosityLevel: ['minimal', 'normal', 'verbose'].includes(config.verbosityLevel ?? '')
            ? config.verbosityLevel
            : DEFAULT_OUTPUT_FILTER_CONFIG.verbosityLevel,
        enableProgressFiltering: config.enableProgressFiltering ?? DEFAULT_OUTPUT_FILTER_CONFIG.enableProgressFiltering,
        enableStackTraceFiltering: config.enableStackTraceFiltering ?? DEFAULT_OUTPUT_FILTER_CONFIG.enableStackTraceFiltering,
        customPatterns: Array.isArray(config.customPatterns) ? config.customPatterns : DEFAULT_OUTPUT_FILTER_CONFIG.customPatterns,
        enableCommandSpecificFiltering: config.enableCommandSpecificFiltering ?? DEFAULT_OUTPUT_FILTER_CONFIG.enableCommandSpecificFiltering,
    };
}
export function validateThorApiConfig(config) {
    return {
        outputFolder: config.outputFolder?.trim() || DEFAULT_THORAPI_CONFIG.outputFolder,
    };
}
export function validateAdvancedSettings(settings) {
    return {
        version: settings.version ?? DEFAULT_ADVANCED_SETTINGS.version,
        fileProcessing: validateFileProcessingConfig(settings.fileProcessing ?? {}),
        matching: validateMatchingConfig(settings.matching ?? {}),
        outputFilter: validateOutputFilterConfig(settings.outputFilter ?? {}),
        performance: {
            enableParallelProcessing: settings.performance?.enableParallelProcessing ?? DEFAULT_PERFORMANCE_CONFIG.enableParallelProcessing,
            maxConcurrentOperations: Math.max(1, Math.min(settings.performance?.maxConcurrentOperations ?? DEFAULT_PERFORMANCE_CONFIG.maxConcurrentOperations, 10)),
            memoryLimit: Math.max(10, settings.performance?.memoryLimit ?? DEFAULT_PERFORMANCE_CONFIG.memoryLimit),
            enableProgressiveLoading: settings.performance?.enableProgressiveLoading ?? DEFAULT_PERFORMANCE_CONFIG.enableProgressiveLoading,
            enableBackgroundPreprocessing: settings.performance?.enableBackgroundPreprocessing ?? DEFAULT_PERFORMANCE_CONFIG.enableBackgroundPreprocessing,
        },
        debugging: {
            enableVerboseLogging: settings.debugging?.enableVerboseLogging ?? DEFAULT_DEBUGGING_CONFIG.enableVerboseLogging,
            saveFailedMatches: settings.debugging?.saveFailedMatches ?? DEFAULT_DEBUGGING_CONFIG.saveFailedMatches,
            enablePerformanceMetrics: settings.debugging?.enablePerformanceMetrics ?? DEFAULT_DEBUGGING_CONFIG.enablePerformanceMetrics,
            logOutputFiltering: settings.debugging?.logOutputFiltering ?? DEFAULT_DEBUGGING_CONFIG.logOutputFiltering,
            showPsrResultsReport: settings.debugging?.showPsrResultsReport ?? DEFAULT_DEBUGGING_CONFIG.showPsrResultsReport,
        },
        budgetAlerts: {
            depletedThreshold: Math.max(0, settings.budgetAlerts?.depletedThreshold ?? DEFAULT_BUDGET_ALERT_CONFIG.depletedThreshold),
            criticalThreshold: Math.max(0, settings.budgetAlerts?.criticalThreshold ?? DEFAULT_BUDGET_ALERT_CONFIG.criticalThreshold),
            lowThreshold: Math.max(0, settings.budgetAlerts?.lowThreshold ?? DEFAULT_BUDGET_ALERT_CONFIG.lowThreshold),
            alertThreshold: Math.max(0, settings.budgetAlerts?.alertThreshold ?? DEFAULT_BUDGET_ALERT_CONFIG.alertThreshold),
        },
        thorapi: validateThorApiConfig(settings.thorapi ?? {}),
    };
}
//# sourceMappingURL=AdvancedSettings.js.map