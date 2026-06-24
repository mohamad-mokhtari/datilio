import React from 'react';

const helpSectionClass = 'space-y-1.5';
const helpHeadingClass = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
const helpBodyClass = 'text-sm text-gray-600 dark:text-gray-300 leading-relaxed';
const helpListClass = 'list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300';

export const DataQualityHelpContent: React.FC = () => (
  <div className="space-y-4">
    <p className={helpBodyClass}>
      Data Quality is a quick health score for this file, from 0% to 100%.
      Higher is better. It helps you spot obvious cleanliness issues before analysis.
    </p>

    <div className={helpSectionClass}>
      <h3 className={helpHeadingClass}>How it is calculated</h3>
      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
        <li>Start at 100%.</li>
        <li>Subtract the share of empty cells (missing values).</li>
        <li>Subtract the share of duplicate rows.</li>
        <li>The result is kept between 0% and 100%.</li>
      </ol>
      <p className={`${helpBodyClass} mt-2`}>
        Example: 5% missing cells and 2% duplicate rows → Data Quality = 93%.
      </p>
    </div>

    <div className={helpSectionClass}>
      <h3 className={helpHeadingClass}>How to read the score</h3>
      <ul className={helpListClass}>
        <li><strong>90–100%</strong> — Very clean data</li>
        <li><strong>70–89%</strong> — Usable, with some gaps or duplicates</li>
        <li><strong>Below 70%</strong> — Review missing values and duplicates</li>
      </ul>
    </div>

    <div className={helpSectionClass}>
      <h3 className={helpHeadingClass}>What it does not check</h3>
      <p className={helpBodyClass}>
        This score does not validate formats, outliers, or business rules. Use preprocessing
        and rules for deeper checks.
      </p>
    </div>
  </div>
);
