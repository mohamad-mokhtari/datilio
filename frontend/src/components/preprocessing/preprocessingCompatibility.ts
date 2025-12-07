/**
 * Preprocessing Compatibility Utility
 * Based on backend documentation: PREPROCESSING_FEATURES_COMPATIBILITY_GUIDE.md
 * 
 * This utility helps enforce compatibility rules and disable incompatible options
 * based on the current configuration.
 */

export interface CompatibilityRule {
  feature: string;
  conflicts: string[];
  requires?: string[];
  appliedAfter?: string[];
}

export const compatibilityRules: { [columnType: string]: CompatibilityRule[] } = {
  numeric: [
    {
      feature: 'missing',
      conflicts: [],
      appliedAfter: []
    },
    {
      feature: 'remove_outliers',
      conflicts: [],
      appliedAfter: ['missing']
    },
    {
      feature: 'log_transform',
      conflicts: [],
      appliedAfter: ['remove_outliers']
    },
    {
      feature: 'scaling',
      conflicts: [],
      appliedAfter: ['log_transform']
    },
    {
      feature: 'binning',
      conflicts: [],
      appliedAfter: ['scaling']
    }
  ],
  categorical: [
    {
      feature: 'missing',
      conflicts: [],
      appliedAfter: []
    },
    {
      feature: 'merge_rare',
      conflicts: ['top_n_categories'],
      appliedAfter: ['missing']
    },
    {
      feature: 'top_n_categories',
      conflicts: ['merge_rare'],
      appliedAfter: ['missing']
    },
    {
      feature: 'encoding',
      conflicts: ['encoding'], // Can't have multiple encodings
      appliedAfter: ['merge_rare', 'top_n_categories']
    }
  ],
  text: [
    {
      feature: 'lowercase',
      conflicts: [],
      appliedAfter: []
    },
    {
      feature: 'remove_punctuation',
      conflicts: [],
      appliedAfter: ['lowercase']
    },
    {
      feature: 'remove_numbers',
      conflicts: [],
      appliedAfter: ['remove_punctuation']
    },
    {
      feature: 'remove_stopwords',
      conflicts: [],
      appliedAfter: ['remove_numbers']
    },
    {
      feature: 'truncate_length',
      conflicts: [],
      appliedAfter: ['remove_stopwords']
    },
    {
      feature: 'stem_or_lemma',
      conflicts: ['stem_or_lemma'], // Can't use both stem and lemma
      appliedAfter: ['truncate_length']
    },
    {
      feature: 'vectorization',
      conflicts: ['vectorization'], // Can't use multiple vectorizations
      appliedAfter: ['stem_or_lemma']
    },
    {
      feature: 'max_features',
      conflicts: [],
      requires: ['vectorization'], // Only works with tfidf or count
      appliedAfter: []
    },
    {
      feature: 'drop_original',
      conflicts: [],
      requires: ['vectorization'],
      appliedAfter: []
    }
  ],
  datetime: [
    {
      feature: 'missing',
      conflicts: [],
      appliedAfter: []
    },
    {
      feature: 'round',
      conflicts: [],
      appliedAfter: ['missing']
    },
    {
      feature: 'convert_timezone',
      conflicts: [],
      appliedAfter: ['round']
    },
    {
      feature: 'extract',
      conflicts: [],
      appliedAfter: ['convert_timezone', 'round']
    },
    {
      feature: 'drop_original',
      conflicts: [],
      requires: ['extract'],
      appliedAfter: []
    }
  ],
  boolean: [
    {
      feature: 'missing',
      conflicts: [],
      appliedAfter: []
    },
    {
      feature: 'encode',
      conflicts: ['encode'], // Can't have multiple encodings
      appliedAfter: ['missing']
    }
  ],
  identifier: [
    {
      feature: 'drop_column',
      conflicts: ['hash_encode']
    },
    {
      feature: 'hash_encode',
      conflicts: ['drop_column']
    }
  ],
  mixed: [
    {
      feature: 'drop_column',
      conflicts: ['convert_to']
    },
    {
      feature: 'convert_to',
      conflicts: ['drop_column']
    }
  ]
};

/**
 * Check if a feature conflicts with current configuration
 */
export function hasConflict(
  columnType: string,
  feature: string,
  currentConfig: any
): boolean {
  const rules = compatibilityRules[columnType] || [];
  const rule = rules.find(r => r.feature === feature);
  
  if (!rule) return false;
  
  // Check for conflicts
  if (rule.conflicts && rule.conflicts.length > 0) {
    for (const conflict of rule.conflicts) {
      // Special case: same feature name means can't have multiple values
      if (conflict === feature) {
        // This is handled by the UI (select only one value)
        continue;
      }
      
      // Check if conflicting feature is enabled
      if (currentConfig[conflict]) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a feature is required but not present
 */
export function isRequiredMissing(
  columnType: string,
  feature: string,
  currentConfig: any
): boolean {
  const rules = compatibilityRules[columnType] || [];
  const rule = rules.find(r => r.feature === feature);
  
  if (!rule || !rule.requires) return false;
  
  // Check if all required features are present
  for (const required of rule.requires) {
    if (!currentConfig[required] || currentConfig[required] === 'none') {
      return true;
    }
  }
  
  return false;
}

/**
 * Get disabled reason for a feature option
 */
export function getDisabledReason(
  columnType: string,
  feature: string,
  optionValue: string,
  currentConfig: any
): string | null {
  // Check if this option conflicts with current config
  if (hasConflict(columnType, feature, currentConfig)) {
    const rules = compatibilityRules[columnType] || [];
    const rule = rules.find(r => r.feature === feature);
    if (rule && rule.conflicts.length > 0) {
      const conflicting = rule.conflicts.find(c => currentConfig[c]);
      if (conflicting) {
        return `Conflicts with ${conflicting}. Please disable ${conflicting} first.`;
      }
    }
  }
  
  // Check if required features are missing
  if (isRequiredMissing(columnType, feature, currentConfig)) {
    const rules = compatibilityRules[columnType] || [];
    const rule = rules.find(r => r.feature === feature);
    if (rule && rule.requires) {
      return `Requires ${rule.requires.join(' or ')} to be enabled first.`;
    }
  }
  
  // Check for same feature multiple values (e.g., multiple encodings)
  const rules = compatibilityRules[columnType] || [];
  const rule = rules.find(r => r.feature === feature);
  if (rule && rule.conflicts.includes(feature)) {
    // This means can't have multiple values - UI should handle this with radio buttons or single select
    return null; // Handled by UI
  }
  
  return null;
}

/**
 * Validate configuration for compatibility
 */
export function validateConfiguration(
  columnType: string,
  config: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const rules = compatibilityRules[columnType] || [];
  
  // Check each rule
  for (const rule of rules) {
    // Skip if feature not in config
    if (!config[rule.feature] || config[rule.feature] === 'none' || config[rule.feature] === false) {
      continue;
    }
    
    // Check conflicts
    if (rule.conflicts && rule.conflicts.length > 0) {
      for (const conflict of rule.conflicts) {
        if (conflict === rule.feature) {
          // Same feature conflict - means can't have multiple values
          // This is handled by UI, skip
          continue;
        }
        
        if (config[conflict] && config[conflict] !== 'none' && config[conflict] !== false) {
          errors.push(`${rule.feature} conflicts with ${conflict}. Please disable one of them.`);
        }
      }
    }
    
    // Check requirements
    if (rule.requires && rule.requires.length > 0) {
      let hasRequired = false;
      for (const required of rule.requires) {
        if (config[required] && config[required] !== 'none' && config[required] !== false) {
          hasRequired = true;
          break;
        }
      }
      
      if (!hasRequired) {
        errors.push(`${rule.feature} requires one of: ${rule.requires.join(', ')}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

