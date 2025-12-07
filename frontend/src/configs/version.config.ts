/**
 * Application Version Configuration
 * 
 * This file controls feature availability based on version.
 * To enable features in a new version, simply increment the version number.
 * 
 * Version History:
 * - 1.0: Initial release (ML Models and Post Processing show "Coming Soon", ML-Ready checkbox hidden)
 * - 1.1: ML Models enabled, Post Processing enabled, ML-Ready checkbox enabled
 */

export const APP_VERSION = '1.0';

// Feature flags based on version
export const FEATURES = {
  // ML Models feature
  ML_MODELS_ENABLED: parseFloat(APP_VERSION) >= 1.1,
  
  // Post Processing feature
  POST_PROCESSING_ENABLED: parseFloat(APP_VERSION) >= 1.1,
  
  // ML-Ready checkbox in Data Preprocessing
  ML_READY_CHECKBOX_ENABLED: parseFloat(APP_VERSION) >= 1.1,
} as const;

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature];
};

export default {
  APP_VERSION,
  FEATURES,
  isFeatureEnabled,
};

