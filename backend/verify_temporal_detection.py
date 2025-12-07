"""
Verification script for temporal type detection.
Run this script to verify the enhanced datetime/date/time detection works correctly.
"""

import pandas as pd
from app.helpers.data_helpers import detect_column_types

def test_temporal_detection():
    """Test the temporal type detection with various formats"""
    
    print("="*80)
    print("Temporal Type Detection Verification")
    print("="*80)
    
    # Create test data with all supported formats
    test_cases = [
        {
            'name': 'ISO 8601 DateTime',
            'data': ['2025-10-16T13:45:30Z', '2025-10-17T14:30:00Z'],
            'expected': 'datetime'
        },
        {
            'name': 'RFC 2822 DateTime',
            'data': ['Thu, 16 Oct 2025 13:45:30 +0000', 'Fri, 17 Oct 2025 14:30:00 +0000'],
            'expected': 'datetime'
        },
        {
            'name': 'Unix Timestamp',
            'data': [1750335930, 1750422330],
            'expected': 'datetime'
        },
        {
            'name': 'US DateTime (12h)',
            'data': ['10/16/2025 01:45:30 PM', '10/17/2025 02:30:00 PM'],
            'expected': 'datetime'
        },
        {
            'name': 'European DateTime',
            'data': ['16/10/2025 13:45:30', '17/10/2025 14:30:00'],
            'expected': 'datetime'
        },
        {
            'name': 'ISO Date',
            'data': ['2025-10-16', '2025-10-17'],
            'expected': 'date'
        },
        {
            'name': 'US Date',
            'data': ['10/16/2025', '10/17/2025'],
            'expected': 'date'
        },
        {
            'name': 'Long Date',
            'data': ['Thursday, October 16, 2025', 'Friday, October 17, 2025'],
            'expected': 'date'
        },
        {
            'name': 'Time 24h',
            'data': ['13:45:30', '14:30:00'],
            'expected': 'time'
        },
        {
            'name': 'Time 12h',
            'data': ['01:45 PM', '02:30 PM'],
            'expected': 'time'
        },
        {
            'name': 'Integer',
            'data': [100, 200],
            'expected': 'integer'
        },
        {
            'name': 'String',
            'data': ['apple', 'banana'],
            'expected': 'string'
        },
    ]
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        df = pd.DataFrame({'test_col': test['data']})
        result = detect_column_types(df)
        detected_type = result['test_col']
        
        status = "[PASS]" if detected_type == test['expected'] else "[FAIL]"
        
        if detected_type == test['expected']:
            passed += 1
            print(f"\n{i}. {status} - {test['name']}")
            print(f"   Expected: {test['expected']}, Got: {detected_type}")
        else:
            failed += 1
            print(f"\n{i}. {status} - {test['name']}")
            print(f"   Expected: {test['expected']}, Got: {detected_type}")
            print(f"   Sample data: {test['data'][0]}")
    
    print("\n" + "="*80)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print("="*80)
    
    return passed == len(test_cases)

if __name__ == "__main__":
    success = test_temporal_detection()
    exit(0 if success else 1)

