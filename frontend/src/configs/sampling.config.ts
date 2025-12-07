// Chart Data Sampling Configuration
// Developers: Modify these values to control data sampling behavior

export const SAMPLING_CONFIG = {
  // Maximum data points to return from API
  // Adjust based on performance requirements
  // Recommended: 5000-20000 for optimal performance
  MAX_POINTS: 4000,
  
  // Default sampling method
  // Options: 'systematic' | 'random'
  DEFAULT_SAMPLING_METHOD: 'systematic' as const,
  
  // Whether to drop fully empty rows
  DROP_EMPTY_ROWS: true,
  
  // Chart-specific sampling configurations
  CHART_CONFIGS: {
    line: {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Preserves temporal patterns'
    },
    area: {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Maintains trend continuity'
    },
    multi_line: {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Preserves temporal patterns for multiple series'
    },
    stacked_area_chart: {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Maintains trend continuity for stacked series'
    },
    scatter: {
      max_points: 3000,
      sampling_method: 'random' as const,
      reason: 'Avoids periodic bias in correlations'
    },
    '3d_scatter': {
      max_points: 3000,
      sampling_method: 'random' as const,
      reason: 'Avoids periodic bias in 3D correlations'
    },
    '5d_scatter': {
      max_points: 3000,
      sampling_method: 'random' as const,
      reason: 'Avoids periodic bias in multi-dimensional correlations'
    },
    bar: {
      max_points: 1000,
      sampling_method: 'systematic' as const,
      reason: 'Too many bars become unreadable'
    },
    bar_histogram: {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Maintains distribution patterns'
    },
    histogram: {
      max_points: 2000,
      sampling_method: 'systematic' as const,
      reason: 'Preserves distribution shape'
    },
    box_plot: {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Maintains statistical distribution'
    },
    pie_chart: {
      max_points: 1000,
      sampling_method: 'systematic' as const,
      reason: 'Limited by visual clarity'
    },
    '3d_surface': {
      max_points: 3000,
      sampling_method: 'systematic' as const,
      reason: 'Maintains surface continuity'
    },
    heatmap: {
      max_points: 3000,
      sampling_method: 'random' as const,
      reason: 'Better distribution representation'
    }
  }
} as const;

// Helper function to get sampling config for a specific chart type
export const getSamplingConfig = (chartType: string) => {
  const config = SAMPLING_CONFIG.CHART_CONFIGS[chartType as keyof typeof SAMPLING_CONFIG.CHART_CONFIGS];
  
  if (config) {
    return config;
  }
  
  // Default fallback config
  return {
    max_points: SAMPLING_CONFIG.MAX_POINTS,
    sampling_method: SAMPLING_CONFIG.DEFAULT_SAMPLING_METHOD,
    reason: 'Default sampling configuration'
  };
};

