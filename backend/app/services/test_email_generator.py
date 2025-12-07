"""
Testing Mimesis Email Generator

Testing the email() method from Mimesis Person provider with different parameters:
- domains: List of custom domains
- unique: Makes email addresses unique
"""

from mimesis import Person
from mimesis.locales import Locale
import pandas as pd

print("=" * 80)
print("TESTING MIMESIS EMAIL GENERATOR")
print("=" * 80)

# Test 1: Basic Email Generation (No Parameters)
print("\n" + "=" * 80)
print("Test 1: Basic Email Generation (No Parameters)")
print("=" * 80)
person = Person(locale=Locale.EN)

print("\nGenerating 10 random emails:")
for i in range(10):
    print(f"{i+1:2d}. {person.email()}")

# Test 2: Custom Domains
print("\n" + "=" * 80)
print("Test 2: Custom Domains")
print("=" * 80)
custom_domains = ['company.com', 'example.org', 'mysite.io']
print(f"\nCustom domains: {custom_domains}")
print("\nGenerating 10 emails with custom domains:")

for i in range(10):
    email = person.email(domains=custom_domains)
    print(f"{i+1:2d}. {email}")

# Test 3: Unique Emails
print("\n" + "=" * 80)
print("Test 3: Unique Emails")
print("=" * 80)
# Create a new Person instance for unique emails (without seed)
person_unique = Person(locale=Locale.EN)

print("\nGenerating 10 unique emails:")
unique_emails = []
for i in range(10):
    email = person_unique.email(unique=True)
    unique_emails.append(email)
    print(f"{i+1:2d}. {email}")

print(f"\nTotal generated: {len(unique_emails)}")
print(f"Unique count: {len(set(unique_emails))}")
print(f"All unique? {len(unique_emails) == len(set(unique_emails))}")

# Test 4: Unique Emails with Custom Domains
print("\n" + "=" * 80)
print("Test 4: Unique Emails with Custom Domains")
print("=" * 80)
person_custom_unique = Person(locale=Locale.EN)
custom_domains_2 = ['company.com', 'example.org', 'mysite.io', 'testdomain.net']
print(f"\nCustom domains: {custom_domains_2}")
print("\nGenerating 15 unique emails with custom domains:")

unique_custom_emails = []
for i in range(15):
    email = person_custom_unique.email(domains=custom_domains_2, unique=True)
    unique_custom_emails.append(email)
    print(f"{i+1:2d}. {email}")

print(f"\nTotal generated: {len(unique_custom_emails)}")
print(f"Unique count: {len(set(unique_custom_emails))}")
print(f"All unique? {len(unique_custom_emails) == len(set(unique_custom_emails))}")

# Test 5: Testing with Seeded Provider (Should Raise Error)
print("\n" + "=" * 80)
print("Test 5: Testing with Seeded Provider (Should Raise Error)")
print("=" * 80)
person_seeded = Person(locale=Locale.EN, seed=12345)

print("\nTesting unique=True with seeded provider (should raise error):")
try:
    email = person_seeded.email(unique=True)
    print(f"Generated: {email}")
except ValueError as e:
    print(f"[X] Error (expected): {str(e)}")

# Test 6: Generate DataFrame with Emails
print("\n" + "=" * 80)
print("Test 6: Generate DataFrame with Emails")
print("=" * 80)
person_df = Person(locale=Locale.EN)
custom_domains_3 = ['company.com', 'example.org', 'mysite.io']

data = {
    'name': [person_df.full_name() for _ in range(20)],
    'email_default': [person_df.email() for _ in range(20)],
}

# Create separate person instances for unique emails
person_unique_df = Person(locale=Locale.EN)
person_custom_df = Person(locale=Locale.EN)
person_custom_unique_df = Person(locale=Locale.EN)

data['email_custom_domain'] = [person_custom_df.email(domains=custom_domains_3) for _ in range(20)]
data['email_unique'] = [person_unique_df.email(unique=True) for _ in range(20)]
data['email_custom_unique'] = [person_custom_unique_df.email(domains=custom_domains_3, unique=True) for _ in range(20)]

df = pd.DataFrame(data)
print("\nGenerated DataFrame with different email types:")
print(df.to_string())

# Test 7: Verify Email Domain Distribution
print("\n" + "=" * 80)
print("Test 7: Verify Email Domain Distribution")
print("=" * 80)

def extract_domain(email):
    return email.split('@')[1] if '@' in email else None

# Extract domains from custom domain column
domains_custom = df['email_custom_domain'].apply(extract_domain)
domains_custom_unique = df['email_custom_unique'].apply(extract_domain)

print("\nDomain distribution (email_custom_domain):")
print(domains_custom.value_counts())

print("\nDomain distribution (email_custom_unique):")
print(domains_custom_unique.value_counts())

print("\nAll domains in custom emails:")
print(f"Expected: {custom_domains_3}")
print(f"Found: {sorted(domains_custom.unique())}")

# Test 8: Configuration Examples for Synthetic Data Service
print("\n" + "=" * 80)
print("Test 8: Configuration Examples for Synthetic Data Service")
print("=" * 80)

import json

config_examples = {
    "example_1_basic": {
        "columns": {
            "email": {
                "category": "mimesis_person",
                "field": "email",
                "params": {}
            }
        }
    },
    "example_2_custom_domains": {
        "columns": {
            "email": {
                "category": "mimesis_person",
                "field": "email",
                "params": {
                    "domains": "['company.com', 'example.org', 'mysite.io']"
                }
            }
        }
    },
    "example_3_unique": {
        "columns": {
            "email": {
                "category": "mimesis_person",
                "field": "email",
                "params": {
                    "unique": "true"
                }
            }
        }
    },
    "example_4_both": {
        "columns": {
            "email": {
                "category": "mimesis_person",
                "field": "email",
                "params": {
                    "domains": "['company.com', 'example.org']",
                    "unique": "true"
                }
            }
        }
    }
}

print("\nConfiguration examples for synthetic_data_service.py:")
print("\n1. Basic (no parameters):")
print(json.dumps(config_examples["example_1_basic"], indent=2))

print("\n2. With custom domains:")
print(json.dumps(config_examples["example_2_custom_domains"], indent=2))

print("\n3. With unique=true:")
print(json.dumps(config_examples["example_3_unique"], indent=2))

print("\n4. With both parameters:")
print(json.dumps(config_examples["example_4_both"], indent=2))

# Test 9: Integration Test with SyntheticDataService
print("\n" + "=" * 80)
print("Test 9: Integration Test with SyntheticDataService")
print("=" * 80)

try:
    from app.services.synthetic_data_service import SyntheticDataService

    # Test basic email generation
    print("\nTest with SyntheticDataService - Basic:")
    config_basic = {
        "columns": {
            "name": {
                "category": "mimesis_person",
                "field": "full_name",
                "params": {}
            },
            "email": {
                "category": "mimesis_person",
                "field": "email",
                "params": {}
            }
        }
    }

    df_basic = SyntheticDataService.create_synthetic_data(config_basic, num_rows=10)
    print(df_basic.to_string())

    # Test with custom domains
    print("\n\nTest with SyntheticDataService - Custom Domains:")
    config_custom = {
        "columns": {
            "name": {
                "category": "mimesis_person",
                "field": "full_name",
                "params": {}
            },
            "email": {
                "category": "mimesis_person",
                "field": "email",
                "params": {
                    "domains": "['company.com', 'example.org', 'mysite.io']"
                }
            }
        }
    }

    df_custom = SyntheticDataService.create_synthetic_data(config_custom, num_rows=10)
    print(df_custom.to_string())

    # Verify domains
    print("\nDomains used:")
    print(df_custom['email'].apply(lambda x: x.split('@')[1]).value_counts())

except Exception as e:
    print(f"Error in integration test: {str(e)}")
    import traceback
    traceback.print_exc()

# Test 10: Check Parameter Processing
print("\n" + "=" * 80)
print("Test 10: Check Parameter Processing")
print("=" * 80)

try:
    from app.services.synthetic_data_service import SyntheticDataService

    # Test different parameter representations
    test_params = [
        ('true', 'Boolean string lowercase'),
        ('True', 'Boolean string capitalized'),
        ('TRUE', 'Boolean string uppercase'),
        ('false', 'Boolean string lowercase'),
        ("['a.com', 'b.com']", 'List string'),
        ('123', 'Integer string'),
        ('45.67', 'Float string'),
    ]

    print("\nTesting parameter processing:")
    for val, desc in test_params:
        processed = SyntheticDataService.process_special_params(val)
        print(f"{desc:30s}: '{val:20s}' -> {str(processed):30s} (type: {type(processed).__name__})")

except Exception as e:
    print(f"Error: {str(e)}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print("""
Key Findings:
1. Basic email generation works without parameters
2. Custom domains parameter accepts a list of domain strings
3. Unique parameter ensures no duplicate emails (but raises error with seeded provider)
4. Both parameters can be used together

For Synthetic Data Service:
- domains: String representation of list: "['company.com', 'example.org']"
- unique: String boolean: "true" or "false" (needs conversion to actual boolean)

TODO:
- Add boolean string conversion in process_special_params() to handle "true"/"false" strings
- Current implementation will treat "true" as string, not boolean
""")

