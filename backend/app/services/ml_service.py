"""
Machine Learning Service
========================

Handles ML model training, evaluation, and prediction.

Supports:
- Regression (Random Forest, Linear Regression, XGBoost, etc.)
- Binary Classification (Logistic Regression, SVM, Random Forest, etc.)
- Multi-class Classification (Random Forest, XGBoost, etc.)
- Clustering (K-Means, DBSCAN)
"""

import pandas as pd
import numpy as np
import pickle
import logging
import time
import os
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID

# Scikit-learn imports
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso
from sklearn.svm import SVR, SVC
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.neighbors import KNeighborsRegressor, KNeighborsClassifier
from sklearn.cluster import KMeans, DBSCAN
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    r2_score, mean_squared_error, mean_absolute_error,  # Regression
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,  # Classification
    silhouette_score  # Clustering
)

# XGBoost (if available)
try:
    from xgboost import XGBRegressor, XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

logger = logging.getLogger(__name__)


class MLService:
    """Service for ML model training and prediction"""
    
    # ==================================================
    # SUPPORTED ALGORITHMS
    # ==================================================
    
    REGRESSION_ALGORITHMS = {
        'random_forest': RandomForestRegressor,
        'linear_regression': LinearRegression,
        'ridge': Ridge,
        'lasso': Lasso,
        'decision_tree': DecisionTreeRegressor,
        'knn': KNeighborsRegressor,
        'svr': SVR,
    }
    
    CLASSIFICATION_ALGORITHMS = {
        'random_forest': RandomForestClassifier,
        'logistic_regression': LogisticRegression,
        'decision_tree': DecisionTreeClassifier,
        'knn': KNeighborsClassifier,
        'svm': SVC,
    }
    
    CLUSTERING_ALGORITHMS = {
        'kmeans': KMeans,
        'dbscan': DBSCAN,
    }
    
    # Add XGBoost if available
    if XGBOOST_AVAILABLE:
        REGRESSION_ALGORITHMS['xgboost'] = XGBRegressor
        CLASSIFICATION_ALGORITHMS['xgboost'] = XGBClassifier
    
    # ==================================================
    # TARGET ANALYSIS
    # ==================================================
    
    @staticmethod
    def analyze_target(df: pd.DataFrame, target_column: Optional[str]) -> Dict[str, Any]:
        """
        Analyze target column to determine problem type.
        
        Returns:
            {
                'problem_type': 'regression' | 'binary_classification' | 'multiclass_classification' | 'clustering',
                'num_unique_classes': int (for classification),
                'class_distribution': dict (for classification),
                'target_dtype': str,
                'is_numeric': bool,
                'suggested_models': list,
                'feature_columns': list
            }
        """
        if target_column is None:
            # Unsupervised learning (clustering)
            return {
                'problem_type': 'clustering',
                'num_unique_classes': None,
                'class_distribution': None,
                'target_dtype': None,
                'is_numeric': False,
                'suggested_models': ['kmeans', 'dbscan'],
                'feature_columns': df.columns.tolist(),
                'total_rows': len(df)
            }
        
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")
        
        target = df[target_column]
        num_unique = target.nunique()
        
        # Check if numeric
        is_numeric = pd.api.types.is_numeric_dtype(target)
        
        # Determine problem type
        if is_numeric and num_unique > 20:
            # Regression (many unique values)
            problem_type = 'regression'
            suggested_models = ['random_forest', 'linear_regression', 'ridge', 'xgboost'] if XGBOOST_AVAILABLE else ['random_forest', 'linear_regression', 'ridge']
            num_unique_classes = None
            class_distribution = None
        elif num_unique == 2:
            # Binary classification
            problem_type = 'binary_classification'
            suggested_models = ['logistic_regression', 'random_forest', 'svm', 'xgboost'] if XGBOOST_AVAILABLE else ['logistic_regression', 'random_forest', 'svm']
            num_unique_classes = 2
            class_distribution = target.value_counts().to_dict()
        elif num_unique <= 20:
            # Multi-class classification
            problem_type = 'multiclass_classification'
            suggested_models = ['random_forest', 'xgboost', 'decision_tree'] if XGBOOST_AVAILABLE else ['random_forest', 'decision_tree']
            num_unique_classes = num_unique
            class_distribution = target.value_counts().to_dict()
        else:
            # Too many classes, treat as regression
            problem_type = 'regression'
            suggested_models = ['random_forest', 'xgboost'] if XGBOOST_AVAILABLE else ['random_forest']
            num_unique_classes = None
            class_distribution = None
        
        # Feature columns (all except target)
        feature_columns = [col for col in df.columns if col != target_column]
        
        return {
            'problem_type': problem_type,
            'num_unique_classes': num_unique_classes,
            'class_distribution': class_distribution,
            'target_dtype': str(target.dtype),
            'is_numeric': is_numeric,
            'suggested_models': suggested_models,
            'feature_columns': feature_columns,
            'total_rows': len(df)
        }
    
    # ==================================================
    # MODEL TRAINING
    # ==================================================
    
    @staticmethod
    def train_model(
        df: pd.DataFrame,
        model_type: str,  # 'regression', 'binary_classification', 'multiclass_classification', 'clustering'
        algorithm: str,
        target_column: Optional[str],
        feature_columns: Optional[List[str]],
        train_size: float,
        random_state: Optional[int],
        hyperparameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Train an ML model.
        
        Returns:
            {
                'model': trained model object,
                'performance_metrics': dict,
                'training_rows': int,
                'test_rows': int,
                'feature_columns': list,
                'column_schema': dict,
                'training_duration_seconds': float
            }
        """
        start_time = time.time()
        
        # Validate algorithm
        if model_type in ['regression']:
            if algorithm not in MLService.REGRESSION_ALGORITHMS:
                raise ValueError(f"Unknown regression algorithm: {algorithm}")
            model_class = MLService.REGRESSION_ALGORITHMS[algorithm]
        elif model_type in ['binary_classification', 'multiclass_classification']:
            if algorithm not in MLService.CLASSIFICATION_ALGORITHMS:
                raise ValueError(f"Unknown classification algorithm: {algorithm}")
            model_class = MLService.CLASSIFICATION_ALGORITHMS[algorithm]
        elif model_type == 'clustering':
            if algorithm not in MLService.CLUSTERING_ALGORITHMS:
                raise ValueError(f"Unknown clustering algorithm: {algorithm}")
            model_class = MLService.CLUSTERING_ALGORITHMS[algorithm]
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Prepare data
        if model_type == 'clustering':
            # Unsupervised: no target column
            if feature_columns:
                X = df[feature_columns]
            else:
                X = df
            y = None
            X_train, X_test = train_test_split(X, test_size=(1-train_size), random_state=random_state)
        else:
            # Supervised: separate features and target
            if target_column not in df.columns:
                raise ValueError(f"Target column '{target_column}' not found")
            
            if feature_columns:
                X = df[feature_columns]
            else:
                X = df.drop(columns=[target_column])
            
            y = df[target_column]
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, train_size=train_size, random_state=random_state
            )
        
        # Initialize model with hyperparameters
        model_params = hyperparameters or {}
        if random_state is not None and 'random_state' not in model_params:
            if algorithm not in ['logistic_regression', 'svm', 'svr', 'dbscan']:  # These don't use random_state
                model_params['random_state'] = random_state
        
        try:
            model = model_class(**model_params)
        except TypeError as e:
            logger.error(f"Invalid hyperparameters for {algorithm}: {e}")
            raise ValueError(f"Invalid hyperparameters for {algorithm}: {e}")
        
        # Train model
        if model_type == 'clustering':
            model.fit(X_train)
        else:
            model.fit(X_train, y_train)
        
        # Evaluate model
        if model_type == 'regression':
            y_pred = model.predict(X_test)
            performance_metrics = {
                'r2_score': float(r2_score(y_test, y_pred)),
                'mse': float(mean_squared_error(y_test, y_pred)),
                'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred))),
                'mae': float(mean_absolute_error(y_test, y_pred))
            }
        elif model_type in ['binary_classification', 'multiclass_classification']:
            y_pred = model.predict(X_test)
            
            # Basic metrics
            performance_metrics = {
                'accuracy': float(accuracy_score(y_test, y_pred))
            }
            
            # Add precision, recall, f1 (handle multi-class with 'weighted')
            avg_method = 'binary' if model_type == 'binary_classification' else 'weighted'
            try:
                performance_metrics['precision'] = float(precision_score(y_test, y_pred, average=avg_method, zero_division=0))
                performance_metrics['recall'] = float(recall_score(y_test, y_pred, average=avg_method, zero_division=0))
                performance_metrics['f1_score'] = float(f1_score(y_test, y_pred, average=avg_method, zero_division=0))
            except Exception as e:
                logger.warning(f"Could not calculate precision/recall/f1: {e}")
            
            # ROC AUC for binary classification
            if model_type == 'binary_classification' and hasattr(model, 'predict_proba'):
                try:
                    y_proba = model.predict_proba(X_test)[:, 1]
                    performance_metrics['roc_auc'] = float(roc_auc_score(y_test, y_proba))
                except Exception as e:
                    logger.warning(f"Could not calculate ROC AUC: {e}")
        
        elif model_type == 'clustering':
            labels = model.labels_ if hasattr(model, 'labels_') else model.predict(X_train)
            
            try:
                performance_metrics = {
                    'silhouette_score': float(silhouette_score(X_train, labels)),
                    'num_clusters': int(len(set(labels)) - (1 if -1 in labels else 0))  # Exclude noise points
                }
                if hasattr(model, 'inertia_'):
                    performance_metrics['inertia'] = float(model.inertia_)
            except Exception as e:
                logger.warning(f"Could not calculate clustering metrics: {e}")
                performance_metrics = {'num_clusters': int(len(set(labels)))}
        
        # Create column schema for validation
        column_schema = {
            'feature_columns': X_train.columns.tolist() if hasattr(X_train, 'columns') else feature_columns,
            'column_types': {col: str(X_train[col].dtype) for col in X_train.columns} if hasattr(X_train, 'columns') else {},
            'column_count': len(X_train.columns) if hasattr(X_train, 'columns') else len(feature_columns or [])
        }
        
        training_duration = time.time() - start_time
        
        return {
            'model': model,
            'performance_metrics': performance_metrics,
            'training_rows': len(X_train),
            'test_rows': len(X_test) if model_type != 'clustering' else 0,
            'feature_columns': column_schema['feature_columns'],
            'column_schema': column_schema,
            'training_duration_seconds': training_duration
        }
    
    # ==================================================
    # MODEL SAVING & LOADING
    # ==================================================
    
    @staticmethod
    def save_model(model: Any, file_path: str) -> int:
        """
        Save model to disk using pickle.
        
        Returns:
            File size in bytes
        """
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'wb') as f:
            pickle.dump(model, f)
        
        return os.path.getsize(file_path)
    
    @staticmethod
    def load_model(file_path: str) -> Any:
        """Load model from disk"""
        with open(file_path, 'rb') as f:
            return pickle.load(f)
    
    # ==================================================
    # PREDICTION
    # ==================================================
    
    @staticmethod
    def validate_prediction_data(
        df: pd.DataFrame,
        column_schema: Dict[str, Any]
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Validate that uploaded data matches the training schema.
        
        Returns:
            (is_valid, errors, warnings)
        """
        errors = []
        warnings = []
        
        expected_columns = column_schema['feature_columns']
        uploaded_columns = df.columns.tolist()
        
        # Check for missing columns
        missing_columns = set(expected_columns) - set(uploaded_columns)
        if missing_columns:
            errors.append(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Check for extra columns (warning only)
        extra_columns = set(uploaded_columns) - set(expected_columns)
        if extra_columns:
            warnings.append(f"Extra columns will be ignored: {', '.join(extra_columns)}")
        
        # Check column types
        expected_types = column_schema.get('column_types', {})
        for col in expected_columns:
            if col in df.columns:
                expected_type = expected_types.get(col)
                actual_type = str(df[col].dtype)
                
                # Flexible type matching (e.g., int32 vs int64)
                if expected_type and not MLService._types_compatible(expected_type, actual_type):
                    warnings.append(f"Column '{col}' type mismatch: expected {expected_type}, got {actual_type}")
        
        is_valid = len(errors) == 0
        
        return is_valid, errors, warnings
    
    @staticmethod
    def _types_compatible(expected: str, actual: str) -> bool:
        """Check if two dtype strings are compatible"""
        # Normalize types
        expected_norm = expected.lower()
        actual_norm = actual.lower()
        
        # Integer types are compatible
        if 'int' in expected_norm and 'int' in actual_norm:
            return True
        
        # Float types are compatible
        if 'float' in expected_norm and 'float' in actual_norm:
            return True
        
        # Exact match
        if expected_norm == actual_norm:
            return True
        
        return False
    
    @staticmethod
    def predict(
        model: Any,
        df: pd.DataFrame,
        feature_columns: List[str],
        model_type: str
    ) -> np.ndarray:
        """
        Make predictions using trained model.
        
        Returns:
            Array of predictions
        """
        # Select only feature columns in correct order
        X = df[feature_columns]
        
        # Make predictions
        if model_type == 'clustering':
            predictions = model.predict(X)
        else:
            predictions = model.predict(X)
        
        return predictions
    
    # ==================================================
    # ALGORITHM INFO
    # ==================================================
    
    @staticmethod
    def get_supported_algorithms() -> Dict[str, List[Dict[str, str]]]:
        """Get list of supported algorithms for each problem type"""
        return {
            'regression': [
                {'value': 'random_forest', 'label': 'Random Forest Regressor', 'description': 'Ensemble method using multiple decision trees'},
                {'value': 'linear_regression', 'label': 'Linear Regression', 'description': 'Simple linear model'},
                {'value': 'ridge', 'label': 'Ridge Regression', 'description': 'Linear regression with L2 regularization'},
                {'value': 'lasso', 'label': 'Lasso Regression', 'description': 'Linear regression with L1 regularization'},
                {'value': 'decision_tree', 'label': 'Decision Tree Regressor', 'description': 'Tree-based model'},
                {'value': 'knn', 'label': 'K-Nearest Neighbors', 'description': 'Instance-based learning'},
                {'value': 'svr', 'label': 'Support Vector Regressor', 'description': 'SVM for regression'},
            ] + ([{'value': 'xgboost', 'label': 'XGBoost Regressor', 'description': 'Gradient boosting (high performance)'}] if XGBOOST_AVAILABLE else []),
            
            'binary_classification': [
                {'value': 'logistic_regression', 'label': 'Logistic Regression', 'description': 'Simple linear classifier'},
                {'value': 'random_forest', 'label': 'Random Forest Classifier', 'description': 'Ensemble method using multiple decision trees'},
                {'value': 'svm', 'label': 'Support Vector Machine', 'description': 'Finds optimal decision boundary'},
                {'value': 'decision_tree', 'label': 'Decision Tree Classifier', 'description': 'Tree-based model'},
                {'value': 'knn', 'label': 'K-Nearest Neighbors', 'description': 'Instance-based learning'},
            ] + ([{'value': 'xgboost', 'label': 'XGBoost Classifier', 'description': 'Gradient boosting (high performance)'}] if XGBOOST_AVAILABLE else []),
            
            'multiclass_classification': [
                {'value': 'random_forest', 'label': 'Random Forest Classifier', 'description': 'Ensemble method using multiple decision trees'},
                {'value': 'decision_tree', 'label': 'Decision Tree Classifier', 'description': 'Tree-based model'},
                {'value': 'knn', 'label': 'K-Nearest Neighbors', 'description': 'Instance-based learning'},
                {'value': 'logistic_regression', 'label': 'Logistic Regression (OvR)', 'description': 'One-vs-Rest multi-class'},
            ] + ([{'value': 'xgboost', 'label': 'XGBoost Classifier', 'description': 'Gradient boosting (high performance)'}] if XGBOOST_AVAILABLE else []),
            
            'clustering': [
                {'value': 'kmeans', 'label': 'K-Means Clustering', 'description': 'Partition data into K clusters'},
                {'value': 'dbscan', 'label': 'DBSCAN', 'description': 'Density-based clustering with noise detection'},
            ]
        }

