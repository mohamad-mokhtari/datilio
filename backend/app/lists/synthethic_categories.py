"""
This module provides structured access to Mimesis data providers and their fields.
It organizes available synthetic data generators by category and documents their parameters.
"""
import mimesis

# Define provider categories
MIMESIS_PROVIDERS = {
    "mimesis_address": mimesis.Address,
    "mimesis_finance": mimesis.Finance,
    "mimesis_datetime": mimesis.Datetime,
    "mimesis_food": mimesis.Food,
    "mimesis_person": mimesis.Person,
    "mimesis_text": mimesis.Text,
    "mimesis_code": mimesis.Code,
    "mimesis_cryptographic": mimesis.Cryptographic,
    "mimesis_development": mimesis.Development,
    "mimesis_file": mimesis.File,
    "mimesis_hardware": mimesis.Hardware,
    "mimesis_internet": mimesis.Internet,
    "mimesis_numeric": mimesis.Numeric,
    "mimesis_path": mimesis.Path,
    "mimesis_payment": mimesis.Payment,
    "mimesis_transport": mimesis.Transport,
    "mimesis_science": mimesis.Science,
}

# Group categories
MIMESIS_CATEGORIES = list(MIMESIS_PROVIDERS.keys())
NUMPY_CATEGORIES = ["numpy_distribution"]
ALL_CATEGORIES = MIMESIS_CATEGORIES + NUMPY_CATEGORIES

# Define data fields and their parameters
ADDRESS_FIELDS = [
    {"address": {"return_type": "str", "params": []}},
    {"calling_code": {"return_type": "str", "params": []}},
    {"city": {"return_type": "str", "params": []}},
    {"continent": {"return_type": "str", "params": [{"code": "bool"}]}},
    {"coordinates": {"return_type": "dict[str, str | float]", "params": [{"dms": "bool"}]}},
    {"country": {"return_type": "str", "params": []}},
    {"country_code": {"return_type": "str", "params": [{"code": "Optional[mimesis.enums.CountryCode]"}]}},
    {"country_emoji_flag": {"return_type": "str", "params": []}},
    {"default_country": {"return_type": "str", "params": []}},
    {"federal_subject": {"return_type": "str", "params": []}},
    {"isd_code": {"return_type": "str", "params": []}},
    {"latitude": {"return_type": "str | float", "params": [{"dms": "bool"}]}},
    {"longitude": {"return_type": "str | float", "params": [{"dms": "bool"}]}},
    {"postal_code": {"return_type": "str", "params": []}},
    {"prefecture": {"return_type": "str", "params": []}},
    {"province": {"return_type": "str", "params": []}},
    {"region": {"return_type": "str", "params": []}},
    {"state": {"return_type": "str", "params": [{"abbr": "bool"}]}},
    {"street_name": {"return_type": "str", "params": []}},
    {"street_number": {"return_type": "str", "params": [{"maximum": "int"}]}},
    {"street_suffix": {"return_type": "str", "params": []}},
    {"zip_code": {"return_type": "str", "params": []}}
]

FINANCE_FIELDS = [
    {"bank": {"return_type": "str", "params": []}},
    {"company": {"return_type": "str", "params": []}},
    {"company_type": {"return_type": "str", "params": [{"abbr": "bool"}]}},
    {"cryptocurrency_iso_code": {"return_type": "str", "params": []}},
    {"cryptocurrency_symbol": {"return_type": "str", "params": []}},
    {"currency_iso_code": {"return_type": "str", "params": [{"allow_random": "bool"}]}},
    {"currency_symbol": {"return_type": "str", "params": []}},
    {"price": {"return_type": "float", "params": [{"minimum": "float", "maximum": "float"}]}},
    {"price_in_btc": {"return_type": "float", "params": [{"minimum": "float", "maximum": "float"}]}},
    {"stock_exchange": {"return_type": "str", "params": []}},
    {"stock_name": {"return_type": "str", "params": []}},
    {"stock_ticker": {"return_type": "str", "params": []}}
]

DATETIME_FIELDS = [
    {"century": {"return_type": "str", "params": []}},
    {"date": {"return_type": "date", "params": [{"start": "int", "end": "int"}]}},
    {"datetime": {"return_type": "datetime", "params": [{"start": "int", "end": "int", "timezone": "Optional[str]"}]}},
    {"day_of_month": {"return_type": "int", "params": []}},
    {"day_of_week": {"return_type": "str", "params": [{"abbr": "bool"}]}},
    {"duration": {"return_type": "timedelta", "params": [{"min_duration": "int", "max_duration": "int", "duration_unit": "Optional[mimesis.enums.DurationUnit]"}]}},
    {"formatted_date": {"return_type": "str", "params": [{"fmt": "str", "kwargs": "Any"}]}},
    {"formatted_datetime": {"return_type": "str", "params": [{"fmt": "str", "kwargs": "Any"}]}},
    {"formatted_time": {"return_type": "str", "params": [{"fmt": "str"}]}},
    {"gmt_offset": {"return_type": "str", "params": []}},
    {"month": {"return_type": "str", "params": [{"abbr": "bool"}]}},
    {"periodicity": {"return_type": "str", "params": []}},
    {"time": {"return_type": "time", "params": []}},
    {"timestamp": {"return_type": "str | int", "params": [{"fmt": "mimesis.enums.TimestampFormat", "kwargs": "Any"}]}},
    {"timezone": {"return_type": "str", "params": [{"region": "Optional[mimesis.enums.TimezoneRegion]"}]}},
    {"week_date": {"return_type": "str", "params": [{"start": "int", "end": "int"}]}},
    {"year": {"return_type": "int", "params": [{"minimum": "int", "maximum": "int"}]}}
]

FOOD_FIELDS = [
    {"dish": {"return_type": "str", "params": []}},
    {"drink": {"return_type": "str", "params": []}},
    {"fruit": {"return_type": "str", "params": []}},
    {"spices": {"return_type": "str", "params": []}},
    {"vegetable": {"return_type": "str", "params": []}}
]

PERSON_FIELDS = [
    {"academic_degree": {"return_type": "str", "params": []}},
    {"birthdate": {"return_type": "date", "params": [{"min_year": "int", "max_year": "int"}]}},
    {"blood_type": {"return_type": "str", "params": []}},
    {"email": {"return_type": "str", "params": [{"domains": "str", "unique": "bool"}]}},
    {"first_name": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender"}]}},
    {"full_name": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender", "reverse": "bool"}]}},
    {"gender": {"return_type": "str", "params": []}},
    {"gender_code": {"return_type": "int", "params": []}},
    {"gender_symbol": {"return_type": "str", "params": []}},
    {"identifier": {"return_type": "str", "params": [{"mask": "str"}]}},
    {"language": {"return_type": "str", "params": []}},
    {"last_name": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender"}]}},
    {"name": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender"}]}},
    {"nationality": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender"}]}},
    {"occupation": {"return_type": "str", "params": []}},
    {"password": {"return_type": "str", "params": [{"length": "int", "hashed": "bool"}]}},
    {"phone_number": {"return_type": "str", "params": [{"mask": "str", "placeholder": "str"}]}},
    {"political_views": {"return_type": "str", "params": []}},
    {"sex": {"return_type": "str", "params": []}},
    {"surname": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender"}]}},
    {"telephone": {"return_type": "str", "params": []}},
    {"title": {"return_type": "str", "params": [{"gender": "mimesis.enums.Gender", "title_type": "mimesis.enums.TitleType"}]}},
    {"university": {"return_type": "str", "params": []}},
    {"username": {"return_type": "str", "params": [{"mask": "str", "drang": "tuple(int)"}]}},
    {"views_on": {"return_type": "str", "params": []}},
    {"weight": {"return_type": "int", "params": [{"minimum": "int", "maximum": "int"}]}},
    {"worldview": {"return_type": "str", "params": []}}
]

TEXT_FIELDS = [
    {"alphabet": {"return_type": "list[str]", "params": [{"lower_case": "bool"}]}},
    {"answer": {"return_type": "str", "params": []}},
    {"color": {"return_type": "str", "params": []}},
    {"emoji": {"return_type": "str", "params": [{"category": "mimesis.enums.EmojyCategory"}]}},
    {"hex_color": {"return_type": "str", "params": [{"safe": "bool"}]}},
    {"level": {"return_type": "str", "params": []}},
    {"quote": {"return_type": "str", "params": []}},
    {"rgb_color": {"return_type": "tuple[int, ...]", "params": [{"safe": "bool"}]}},
    {"sentence": {"return_type": "str", "params": []}},
    {"text": {"return_type": "str", "params": [{"quantity": "int"}]}},
    {"title": {"return_type": "str", "params": []}},
    {"word": {"return_type": "str", "params": []}},
    {"words": {"return_type": "list[str]", "params": [{"quantity": "int"}]}}
]

CODE_FIELDS = [
    {"ean": {"return_type": "str", "params": [{"fmt": "mimesis.enums.EANFormat"}]}},
    {"imei": {"return_type": "str", "params": []}},
    {"isbn": {"return_type": "str", "params": [{"fmt": "mimesis.enums.ISBNFormat"}, {"locale": "mimesis.enums.Locale"}]}},
            {"issn": {"return_type": "str", "params": [{"mask": "str"}]}},
    {"locale_code": {"return_type": "str", "params": []}},
            {"pin": {"return_type": "str", "params": [{"mask": "str"}]}}
]

CRYPTOGRAPHIC_FIELDS = [
    {"hash": {"return_type": "str", "params": [{"algorithm": "mimesis.enums.Algorithm"}]}},
    {"mnemonic_phrase": {"return_type": "str", "params": []}},
            {"token_bytes": {"return_type": "bytes", "params": [{"entropy": "int"}], "static": True}},
            {"token_hex": {"return_type": "str", "params": [{"entropy": "int"}], "static": True}},
            {"token_urlsafe": {"return_type": "str", "params": [{"entropy": "int"}], "static": True}},
    {"uuid": {"return_type": "str", "params": []}},
            {"uuid_object": {"return_type": "UUID", "static": True}}
]

DEVELOPMENT_FIELDS = [
            {"boolean": {"return_type": "bool", "params": []}},
            {"calver": {"return_type": "str", "params": []}},
            {"ility": {"return_type": "str", "params": []}},
            {"os": {"return_type": "str", "params": []}},
            {"programming_language": {"return_type": "str", "params": []}},
            {"software_license": {"return_type": "str", "params": []}},
            {"stage": {"return_type": "str", "params": []}},
            {"system_quality_attribute": {"return_type": "str", "params": []}},
            {"version": {"return_type": "str", "params": []}}
]

FILE_FIELDS = [
    {"extension": {"return_type": "str", "params": [{"file_type": "mimesis.enums.FileType"}]}},
    {"file_name": {"return_type": "str", "params": [{"file_type": "mimesis.enums.FileType"}]}},
    {"mime_type": {"return_type": "str", "params": [{"type_": "mimesis.enums.MimeType"}]}},
    {"size": {"return_type": "str", "params": [{"minimum": "int"}, {"maximum": "int"}]}}
]

HARDWARE_FIELDS = [
            {"cpu": {"return_type": "str", "params": []}},
            {"cpu_codename": {"return_type": "str", "params": []}},
            {"cpu_frequency": {"return_type": "str", "params": []}},
            {"generation": {"return_type": "str", "params": []}},
            {"graphics": {"return_type": "str", "params": []}},
            {"manufacturer": {"return_type": "str", "params": []}},
            {"phone_model": {"return_type": "str", "params": []}},
            {"ram_size": {"return_type": "str", "params": []}},
            {"ram_type": {"return_type": "str", "params": []}},
            {"resolution": {"return_type": "str", "params": []}},
            {"screen_size": {"return_type": "str", "params": []}},
            {"ssd_or_hdd": {"return_type": "str", "params": []}}
]

INTERNET_FIELDS = [
    {"asn": {"return_type": "str", "params": []}},
    {"content_type": {"return_type": "str", "params": [{"mime_type": "None"}]}},
    {"dsn": {"return_type": "str", "params": [{"dsn_type": "mimesis.enums.DSNType"}, {"**kwargs": "Any"}]}},
    {"hostname": {"return_type": "str", "params": [{"tld_type": "mimesis.enums.TLDType"}, {"subdomains": "list[str]"}]}},
    {"http_method": {"return_type": "str", "params": []}},
    {"http_request_headers": {"return_type": "dict[str, Any]", "params": []}},
    {"http_response_headers": {"return_type": "dict[str, Any]", "params": []}},
    {"http_status_code": {"return_type": "int", "params": []}},
    {"http_status_message": {"return_type": "str", "params": []}},
    {"ip_v4": {"return_type": "str", "params": []}},
    {"ip_v4_object": {"return_type": "IPv4Address", "params": []}},
    {"ip_v4_with_port": {"return_type": "str", "params": [{"port_range": "mimesis.enums.PortRange"}]}},
    {"ip_v6": {"return_type": "str", "params": []}},
    {"ip_v6_object": {"return_type": "IPv6Address", "params": []}},
    {"mac_address": {"return_type": "str", "params": []}},
    {"path": {"return_type": "str", "params": ["*args", "**kwargs"]}},
    {"port": {"return_type": "int", "params": [{"port_range": "mimesis.enums.PortRange"}]}},
    {"public_dns": {"return_type": "str", "params": []}},
    {"query_parameters": {"return_type": "dict[str, str]", "params": [{"length": "Optional[int]"}]}},
    {"query_string": {"return_type": "str", "params": [{"length": "Optional[int]"}]}},
    {"slug": {"return_type": "str", "params": [{"parts_count": "Optional[int]"}]}},
    {"stock_image_url": {"return_type": "str", "params": [{"width": "int | str"}, {"height": "int | str"}, {"keywords": "Optional[list[str]]"}]}},
    {"tld": {"return_type": "str", "params": ["*args", "**kwargs"]}},
    {"top_level_domain": {"return_type": "str", "params": [{"tld_type": "mimesis.enums.TLDType"}]}},
    {"uri": {"return_type": "str", "params": [{"scheme": "mimesis.enums.URLScheme"}, {"tld_type": "mimesis.enums.TLDType"}, {"subdomains": "Optional[list[str]]"}, {"query_params_count": "Optional[int]"}]}},
    {"url": {"return_type": "str", "params": [{"scheme": "mimesis.enums.URLScheme"}, {"port_range": "mimesis.enums.PortRange"}, {"tld_type": "Optional[mimesis.enums.TLDType]"}, {"subdomains": "Optional[list[str]]"}]}},
    {"user_agent": {"return_type": "str", "params": []}}
]

NUMERIC_FIELDS = [
            {"complex_number": {
        "return_type": "complex",
                "params": [
                    {"start_real": "float"}, 
                    {"end_real": "float"}, 
                    {"start_imag": "float"}, 
                    {"end_imag": "float"},
                    {"precision_real": "int=15"}, 
                    {"precision_imag": "int=15"}
        ]
    }},
            {"decimal_number": {
        "return_type": "Decimal",
                "params": [
                    {"start": "float=-1000.0"}, 
                    {"end": "float=1000.0"}
        ]
            }},
            {"float_number": {
        "return_type": "float",
        "params": [{"start": "float=-1000.0"}, {"end": "float=1000.0"}, {"precision": "int=15"}]
            }},
            {"increment": {
        "return_type": "int",
        "params": [{"accumulator": "Optional[str]=None"}]
            }},
            {"integer_number": {
        "return_type": "int",
        "params": [{"start": "int=-1000"}, {"end": "int=1000"}]
    }}
]

PATH_FIELDS = [
    {"dev_dir": {"return_type": "str", "params": []}},
    {"home": {"return_type": "str", "params": []}},
    {"project_dir": {"return_type": "str", "params": []}},
    {"root": {"return_type": "str", "params": []}},
    {"user": {"return_type": "str", "params": []}},
    {"users_folder": {"return_type": "str", "params": []}}
]

PAYMENT_FIELDS = [
    {"bitcoin_address": {"return_type": "str", "params": []}},
    {"cid": {"return_type": "str", "params": []}},
    {"credit_card_expiration_date": {"return_type": "str", "params": [{"minimum": "int=16"}, {"maximum": "int=25"}]}},
    {"credit_card_network": {"return_type": "str", "params": []}},
    {"credit_card_number": {"return_type": "str", "params": [{"card_type": "mimesis.enums.CardType"}]}},
    {"credit_card_owner": {"return_type": "dict[str, str]", "params": [{"gender": "mimesis.enums.Gender"}]}},
    {"cvv": {"return_type": "str", "params": []}},
    {"ethereum_address": {"return_type": "str", "params": []}},
    {"paypal": {"return_type": "str", "params": []}}
]

TRANSPORT_FIELDS = [
    {"airplane": {"return_type": "str", "params": []}},
    {"car": {"return_type": "str", "params": []}},
    {"manufacturer": {"return_type": "str", "params": []}},
    {"vehicle_registration_code": {"return_type": "str", "params": [{"locale": "mimesis.enums.Locale"}]}}
]

SCIENCE_FIELDS = [
    {"dna_sequence": {"return_type": "str", "params": [{"length": "int=10"}]}},
    {"measure_unit": {"return_type": "str", "params": [{"name": "mimesis.enums.MeasureUnit"}, {"symbol": "bool=False"}]}},
    {"metric_prefix": {"return_type": "str", "params": [{"sign": "mimesis.enums.MetricPrefixSign"}, {"symbol": "bool=False"}]}},
    {"rna_sequence": {"return_type": "str", "params": [{"length": "int=10"}]}}
]

NUMPY_DISTRIBUTION_FIELDS = [
    {"uniform": {"return_type": "ndarray", "params": [{"low": "float"}, {"high": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"normal": {"return_type": "ndarray", "params": [{"loc": "float"}, {"scale": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"binomial": {"return_type": "ndarray", "params": [{"n": "int"}, {"p": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"poisson": {"return_type": "ndarray", "params": [{"lam": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"exponential": {"return_type": "ndarray", "params": [{"scale": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"gamma": {"return_type": "ndarray", "params": [{"shape": "float"}, {"scale": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"beta": {"return_type": "ndarray", "params": [{"a": "float"}, {"b": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"chisquare": {"return_type": "ndarray", "params": [{"df": "int"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"geometric": {"return_type": "ndarray", "params": [{"p": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"lognormal": {"return_type": "ndarray", "params": [{"mean": "float"}, {"sigma": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"pareto": {"return_type": "ndarray", "params": [{"a": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"triangular": {"return_type": "ndarray", "params": [{"left": "float"}, {"mode": "float"}, {"right": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"weibull": {"return_type": "ndarray", "params": [{"a": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"wald": {"return_type": "ndarray", "params": [{"mean": "float"}, {"scale": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}},
    {"zipf": {"return_type": "ndarray", "params": [{"a": "float"}, {"size": "int"}], "category_type": "multi", "multi_type": "size"}}
]

# Consolidate all data fields
ALL_DATA = {
    "mimesis_address": ADDRESS_FIELDS,
    "mimesis_finance": FINANCE_FIELDS,
    "mimesis_datetime": DATETIME_FIELDS,
    "mimesis_food": FOOD_FIELDS,
    "mimesis_person": PERSON_FIELDS,
    "mimesis_text": TEXT_FIELDS,
    "mimesis_code": CODE_FIELDS,
    "mimesis_cryptographic": CRYPTOGRAPHIC_FIELDS,
    "mimesis_development": DEVELOPMENT_FIELDS,
    "mimesis_file": FILE_FIELDS,
    "mimesis_hardware": HARDWARE_FIELDS,
    "mimesis_internet": INTERNET_FIELDS,
    "mimesis_numeric": NUMERIC_FIELDS,
    "mimesis_path": PATH_FIELDS,
    "mimesis_payment": PAYMENT_FIELDS,
    "mimesis_transport": TRANSPORT_FIELDS,
    "mimesis_science": SCIENCE_FIELDS,
    "numpy_distribution": NUMPY_DISTRIBUTION_FIELDS
}


def extract_field_names():
    # List to hold all field names
    all_fields = []

    # Function to extract field names from a list of fields
    def extract_field_name(fields):
        for field in fields:
            for key in field.keys():
                all_fields.append(key)

    # Extracting fields from each category
    extract_field_name(ADDRESS_FIELDS)
    extract_field_name(FINANCE_FIELDS)
    extract_field_name(DATETIME_FIELDS)
    extract_field_name(FOOD_FIELDS)
    extract_field_name(PERSON_FIELDS)
    extract_field_name(TEXT_FIELDS)
    extract_field_name(CODE_FIELDS)
    extract_field_name(CRYPTOGRAPHIC_FIELDS)
    extract_field_name(DEVELOPMENT_FIELDS)
    extract_field_name(FILE_FIELDS)
    extract_field_name(HARDWARE_FIELDS)
    extract_field_name(INTERNET_FIELDS)
    extract_field_name(NUMERIC_FIELDS)
    extract_field_name(PATH_FIELDS)
    extract_field_name(PAYMENT_FIELDS)
    extract_field_name(TRANSPORT_FIELDS)
    extract_field_name(SCIENCE_FIELDS)
    extract_field_name(NUMPY_DISTRIBUTION_FIELDS)

    return all_fields