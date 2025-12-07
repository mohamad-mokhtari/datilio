from typing import List, Optional, Literal
import random
import numpy as np
from mimesis import Person, Address
from mimesis.locales import Locale
from pydantic import BaseModel, Field, field_validator

# Define supported column types
ColumnType = Literal["integer", "float", "enum", "name", "city", "country"]

# Define supported distributions
DistributionType = Literal["uniform", "normal", "exponential", "poisson", "beta", "gamma", "lognormal"]

# Define schema for numeric range or distribution settings
class NumericRange(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None
    lambda_: Optional[float] = None  # For Exponential, Poisson
    alpha: Optional[float] = None  # For Beta, Gamma
    beta: Optional[float] = None  # For Beta
    shape: Optional[float] = None  # For Gamma
    scale: Optional[float] = None  # For Gamma
    sigma: Optional[float] = None  # For Log-normal
    distribution: Optional[DistributionType] = None  # Choose distribution

    @field_validator('min', 'max', mode='before')
    def check_min_max(cls, v, values):
        if values.get('distribution') == 'uniform' and (v is None):
            raise ValueError('min and max must be set for uniform distribution')
        return v

    @field_validator('mean', 'std', mode='before')
    def check_mean_std(cls, v, values):
        if values.get('distribution') == 'normal' and (v is None):
            raise ValueError('mean and std must be set for normal distribution')
        return v

    @field_validator('lambda_', mode='before')
    def check_lambda(cls, v, values):
        if values.get('distribution') in ['exponential', 'poisson'] and (v is None):
            raise ValueError('lambda_ must be set for exponential and poisson distributions')
        return v

    @field_validator('alpha', 'beta', mode='before')
    def check_alpha_beta(cls, v, values):
        if values.get('distribution') == 'beta' and (v is None):
            raise ValueError('alpha and beta must be set for beta distribution')
        return v

    @field_validator('shape', 'scale', mode='before')
    def check_shape_scale(cls, v, values):
        if values.get('distribution') == 'gamma' and (v is None):
            raise ValueError('shape and scale must be set for gamma distribution')
        return v

    @field_validator('mean', 'sigma', mode='before')
    def check_mean_sigma(cls, v, values):
        if values.get('distribution') == 'lognormal' and (v is None):
            raise ValueError('mean and sigma must be set for lognormal distribution')
        return v

# Define schema for each column
class ColumnInfo(BaseModel):
    name: str
    type: ColumnType
    range: Optional[NumericRange] = None
    enum_values: Optional[List[str]] = None  # Used if type is "enum"

    @field_validator('range', mode='before')
    def check_range_for_type(cls, v, values):
        if values['type'] == 'integer' and (v is None or v.min is None or v.max is None):
            raise ValueError('min and max must be set for integer type')
        return v

# Main request model
class MetadataRequest(BaseModel):
    number_of_columns: int = Field(..., gt=0)
    columns_info: List[ColumnInfo]

class SyntheticDataWorker:
    def __init__(self):
        self.person = Person(Locale.EN)
        self.address = Address(Locale.EN)

    def generate_synthetic_data(self, metadata: MetadataRequest):
        data = []
        for col in metadata.columns_info:
            if col.type == "integer":
                value = random.randint(col.range.min, col.range.max) if col.range else None
            elif col.type == "float" and col.range and col.range.distribution:
                dist = col.range.distribution
                if dist == "normal":
                    value = random.gauss(col.range.mean, col.range.std)
                elif dist == "uniform":
                    value = random.uniform(col.range.min, col.range.max)
                elif dist == "exponential":
                    value = np.random.exponential(col.range.lambda_)
                elif dist == "poisson":
                    value = np.random.poisson(col.range.lambda_)
                elif dist == "beta":
                    value = np.random.beta(col.range.alpha, col.range.beta)
                elif dist == "gamma":
                    value = np.random.gamma(col.range.shape, col.range.scale)
                elif dist == "lognormal":
                    value = np.random.lognormal(col.range.mean, col.range.sigma)
                else:
                    value = None
            elif col.type == "enum":
                value = random.choice(col.enum_values) if col.enum_values else None
            elif col.type == "name":
                value = self.person.full_name()
            elif col.type == "city":
                value = self.address.city()
            elif col.type == "country":
                value = self.address.country()
            else:
                value = None

            data.append({col.name: value})

        return data
