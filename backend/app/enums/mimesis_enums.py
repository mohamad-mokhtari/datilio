from enum import Enum

class Algorithm(Enum):
    BLAKE2B = 'blake2b'
    BLAKE2S = 'blake2s'
    MD5 = 'md5'
    SHA1 = 'sha1'
    SHA224 = 'sha224'
    SHA256 = 'sha256'
    SHA384 = 'sha384'
    SHA512 = 'sha512'

class AudioFile(Enum):
    AAC = 'aac'
    MP3 = 'mp3'

class CardType(Enum):
    AMERICAN_EXPRESS = 'American Express'
    MASTER_CARD = 'MasterCard'
    VISA = 'Visa'

class CompressedFile(Enum):
    GZIP = 'gz'
    ZIP = 'zip'

class CountryCode(Enum):
    A2 = 'a2'
    A3 = 'a3'
    FIFA = 'fifa'
    IOC = 'ioc'
    NUMERIC = 'numeric'

class DSNType(Enum):
    COUCHBASE = ('couchbase', 8092)
    MEMCACHED = ('memcached', 11211)
    MONGODB = ('mongodb', 27017)
    MYSQL = ('mysql', 3306)
    POSTGRES = ('postgres', 5432)
    RABBITMQ = ('rabbitmq', 5672)
    REDIS = ('redis', 6379)

class DocumentFile(Enum):
    DOCX = 'docx'
    PDF = 'pdf'
    PPTX = 'pptx'
    XLSX = 'xlsx'

class DurationUnit(Enum):
    DAYS = 'days'
    HOURS = 'hours'
    MICROSECONDS = 'microseconds'
    MILLISECONDS = 'milliseconds'
    MINUTES = 'minutes'
    SECONDS = 'seconds'
    WEEKS = 'weeks'

class EANFormat(Enum):
    EAN13 = 'ean-13'
    EAN8 = 'ean-8'

class EmojyCategory(Enum):
    ACTIVITIES = 'activities'
    ANIMALS_AND_NATURE = 'animals_and_nature'
    DEFAULT = 'smileys_and_emotion'
    FLAGS = 'flags'
    FOOD_AND_DRINK = 'food_and_drink'
    OBJECTS = 'objects'
    PEOPLE_AND_BODY = 'people_and_body'
    SMILEYS_AND_EMOTION = 'smileys_and_emotion'
    SYMBOLS = 'symbols'
    TRAVEL_AND_PLACES = 'travel_and_places'

class FileType(Enum):
    AUDIO = 'audio'
    COMPRESSED = 'compressed'
    DATA = 'data'
    EXECUTABLE = 'executable'
    IMAGE = 'image'
    SOURCE = 'source'
    TEXT = 'text'
    VIDEO = 'video'

class Gender(Enum):
    FEMALE = 'female'
    MALE = 'male'

class ISBNFormat(Enum):
    ISBN10 = 'isbn-10'
    ISBN13 = 'isbn-13'

class ImageFile(Enum):
    GIF = 'gif'
    JPG = 'jpg'
    PNG = 'png'

class Locale(Enum):
    CS = 'cs'
    DA = 'da'
    DE = 'de'
    DEFAULT = 'en'
    DE_AT = 'de-at'
    DE_CH = 'de-ch'
    EL = 'el'
    EN = 'en'
    EN_AU = 'en-au'
    EN_CA = 'en-ca'
    EN_GB = 'en-gb'
    ES = 'es'
    ES_MX = 'es-mx'
    ET = 'et'
    FA = 'fa'
    FI = 'fi'
    FR = 'fr'
    HR = 'hr'
    HU = 'hu'
    IS = 'is'
    IT = 'it'
    JA = 'ja'
    KK = 'kk'
    KO = 'ko'
    NL = 'nl'
    NL_BE = 'nl-be'
    NO = 'no'
    PL = 'pl'
    PT = 'pt'
    PT_BR = 'pt-br'
    RU = 'ru'
    SK = 'sk'
    SV = 'sv'
    TR = 'tr'
    UK = 'uk'
    ZH = 'zh'

class MeasureUnit(Enum):
    AMOUNT_OF_SUBSTANCE = ('mole', 'mol')
    ANGLE = ('radian', 'r')
    ELECTRICAL_CONDUCTANCE = ('siemens', 'S')
    ELECTRIC_CAPACITANCE = ('farad', 'F')
    ELECTRIC_CHARGE = ('coulomb', 'C')
    ELECTRIC_RESISTANCE = ('ohm', 'Ω')
    ENERGY = ('joule', 'J')
    FLUX = ('watt', 'W')
    FORCE = ('newton', 'N')
    FREQUENCY = ('hertz', 'Hz')
    INDUCTANCE = ('henry', 'H')
    INFORMATION = ('byte', 'b')
    MAGNETIC_FLUX = ('weber', 'Wb')
    MAGNETIC_FLUX_DENSITY = ('tesla', 'T')
    MASS = ('gram', 'gr')
    POWER = ('watt', 'W')
    PRESSURE = ('pascal', 'P')
    RADIOACTIVITY = ('becquerel', 'Bq')
    SOLID_ANGLE = ('steradian', '㏛')
    TEMPERATURE = ('Celsius', '°C')
    THERMODYNAMIC_TEMPERATURE = ('kelvin', 'K')
    VOLTAGE = ('volt', 'V')

class MetricPrefixSign(Enum):
    NEGATIVE = 'negative'
    POSITIVE = 'positive'

class MimeType(Enum):
    APPLICATION = 'application'
    AUDIO = 'audio'
    IMAGE = 'image'
    MESSAGE = 'message'
    TEXT = 'text'
    VIDEO = 'video'

class NumType(Enum):
    COMPLEX = 'complexes'
    DECIMAL = 'decimals'
    FLOAT = 'floats'
    INTEGER = 'integers'

class PortRange(Enum):
    ALL = (1, 65535)
    EPHEMERAL = (49152, 65535)
    REGISTERED = (1024, 49151)
    WELL_KNOWN = (1, 1023)

class TLDType(Enum):
    CCTLD = 'cctld'
    GEOTLD = 'geotld'
    GTLD = 'gtld'
    STLD = 'stld'
    UTLD = 'utld'

class TimestampFormat(Enum):
    ISO_8601 = 2
    POSIX = 1
    RFC_3339 = 3

class TimezoneRegion(Enum):
    AFRICA = 'Africa'
    AMERICA = 'America'
    ANTARCTICA = 'Antarctica'
    ARCTIC = 'Arctic'
    ASIA = 'Asia'
    ATLANTIC = 'Atlantic'
    AUSTRALIA = 'Australia'
    EUROPE = 'Europe'
    INDIAN = 'Indian'
    PACIFIC = 'Pacific'

class TitleType(Enum):
    ACADEMIC = 'academic'
    TYPICAL = 'typical'

class URLScheme(Enum):
    FTP = 'ftp'
    HTTP = 'http'
    HTTPS = 'https'
    SFTP = 'sftp'
    WS = 'ws'
    WSS = 'wss'

class VideoFile(Enum):
    MOV = 'mov'
    MP4 = 'mp4'


