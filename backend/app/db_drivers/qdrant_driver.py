from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, Filter, PointStruct

import pandas as pd
import numpy as np
import json, os
import logging
from typing import List
import ast

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)

class QdrantDriver:
    def __init__(self):
        try:
            self.qdrant_client = QdrantClient(
                f"http://{settings.QDRANT_HOST}:{settings.QDRANT_PORT}", timeout=60
            )
            logging.info("Connected to Qdrant client.")
        except Exception as e:
            logging.error(f"Failed to connect to Qdrant client: {e}")

    def get_collections_name(self):
        """Retrieve the names of all collections."""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [collection.name for collection in collections.collections]
            return collection_names
        except Exception as e:
            logging.error(f"Error retrieving collections: {e}")
            return []

    def create_collection(self, collection_name, vector_size):
        """Create a new collection if it does not exist."""
        try:
            if not self.qdrant_client.collection_exists(collection_name):
                self.qdrant_client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
                )
                logging.info(f"Collection '{collection_name}' created.")
            else:
                logging.info(f"Collection '{collection_name}' already exists.")
        except Exception as e:
            logging.error(f"Error creating collection '{collection_name}': {e}")

    def remove_collection(self, collection_name):
        """Remove a collection if it exists."""
        try:
            if self.qdrant_client.collection_exists(collection_name):
                self.qdrant_client.delete_collection(collection_name)
                logging.info(f"Collection '{collection_name}' removed.")
            else:
                logging.info(f"Collection '{collection_name}' does not exist.")
        except Exception as e:
            logging.error(f"Error removing collection '{collection_name}': {e}")
    
    def get_collection_info(self, collection_name):
        """
        Get detailed information about a collection.
        
        Args:
            collection_name: Name of the collection to get info about
            
        Returns:
            Collection information including points count, vector configuration, 
            payload schema (fields available for hybrid search), and other collection settings
        """
        try:
            collection_info = self.qdrant_client.get_collection(collection_name)
            info_dict = collection_info.dict()
            
            # Get payload schema information by retrieving a sample of points
            payload_fields = {}
            try:
                # Try to get a sample point to extract payload fields
                sample_points = self.qdrant_client.scroll(
                    collection_name=collection_name,
                    limit=1,
                    with_payload=True,
                    with_vectors=False
                )[0]
                
                if sample_points:
                    # Extract payload fields and their types from the first point
                    sample_payload = sample_points[0].payload
                    for key, value in sample_payload.items():
                        if isinstance(value, (int, np.integer)):
                            payload_fields[key] = "integer"
                        elif isinstance(value, (float, np.float64)):
                            payload_fields[key] = "float"
                        elif isinstance(value, bool):
                            payload_fields[key] = "boolean"
                        elif isinstance(value, str):
                            payload_fields[key] = "text"
                        else:
                            payload_fields[key] = str(type(value).__name__)
            except Exception as e:
                logging.warning(f"Error getting payload fields for collection '{collection_name}': {e}")
                
            # Add payload fields information to the response
            info_dict["payload_fields"] = payload_fields
            
            return info_dict  # Return the enhanced dictionary
        except Exception as e:
            logging.error(f"Error retrieving information for collection '{collection_name}': {e}")
            raise Exception(f"Failed to get collection info: {str(e)}")

    def retrieve_points(self, collection_name, limit=5):
        """Retrieve points from a collection with optional limit."""
        all_points = []
        scroll_id = None

        try:
            while True:
                scroll_result = self.qdrant_client.scroll(
                    collection_name=collection_name,
                    limit=limit,  # Fetch limited points at a time
                    scroll_filter=None,  # No filter, get all points
                    with_vectors=True,  # Retrieve vectors
                    with_payload=True,  # Retrieve metadata/payloads
                    offset=scroll_id,
                )
                all_points.extend(scroll_result[0])  # Add results to list
                scroll_id = scroll_result[1]  # Update scroll ID

                if scroll_id is None:
                    break  # Stop if there are no more points
        except Exception as e:
            logging.error(f"Error retrieving points from collection '{collection_name}': {e}")

        return all_points

    def add_points(self, collection_name, points):
        """Add points to a collection."""
        try:
            self.qdrant_client.upsert(collection_name=collection_name, points=points)
            logging.info(f"Added points to collection '{collection_name}'.")
        except Exception as e:
            logging.error(f"Error adding points to collection '{collection_name}': {e}")

    def update_points(self, collection_name, points):
        """Update existing points in a collection."""
        try:
            self.qdrant_client.upsert_points(collection_name=collection_name, points=points)
            logging.info(f"Updated points in collection '{collection_name}'.")
        except Exception as e:
            logging.error(f"Error updating points in collection '{collection_name}': {e}")

    def search(self, collection_name, query_vector, limit=5, payload_filter=None):
        """
        Search for similar points in a collection with optional payload filtering for hybrid search.
        
        Args:
            collection_name: Name of the collection to search in
            query_vector: Vector to search for similar vectors
            limit: Maximum number of results to return
            payload_filter: Optional filter conditions for payload-based (hybrid) search
            
        Returns:
            List of search results
        """
        try:
            # Create a Filter object if payload_filter is provided
            filter_obj = None
            if payload_filter:
                filter_obj = Filter(**payload_filter)
            
            search_result = self.qdrant_client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit,
                query_filter=filter_obj
            )
            return search_result
        except Exception as e:
            logging.error(f"Error searching points in collection '{collection_name}': {e}")
            raise Exception(f"Search failed: {str(e)}")

    def filter_points(self, collection_name, filter_conditions, limit=5):
        """Retrieve points based on filter conditions."""
        try:
            filtered_points = self.qdrant_client.scroll(
                collection_name=collection_name,
                limit=limit,
                scroll_filter=Filter(**filter_conditions),
                with_vectors=True,
                with_payload=True
            )
            return filtered_points
        except Exception as e:
            logging.error(f"Error filtering points in collection '{collection_name}': {e}")
            return []

    def backup_collection(self, collection_name, backup_path):
        """Backup a collection to a specified path."""
        try:
            # Assuming a method to export collection exists
            self.qdrant_client.export_collection(collection_name, backup_path)
            logging.info(f"Collection '{collection_name}' backed up to '{backup_path}'.")
        except Exception as e:
            logging.error(f"Error backing up collection '{collection_name}': {e}")

    def restore_collection(self, backup_path, collection_name):
        """Restore a collection from a backup."""
        try:
            # Assuming a method to import collection exists
            self.qdrant_client.import_collection(backup_path, collection_name)
            logging.info(f"Collection '{collection_name}' restored from '{backup_path}'.")
        except Exception as e:
            logging.error(f"Error restoring collection '{collection_name}': {e}")

    def create_points_from_csv(self, csv_path: str, vector_column: str = "vectors", payload_columns: List[str] = None) -> List[PointStruct]:
        """
        Create Qdrant points from CSV file containing vectors and optional payload columns.
        
        Args:
            csv_path: Path to the CSV file
            vector_column: Name of the column containing vectors (default: "vectors")
            payload_columns: List of column names to include in payload (default: None)
            
        Returns:
            List of PointStruct objects ready to be inserted into Qdrant
        """
        try:
            # Read CSV file
            df = pd.read_csv(csv_path)
            
            # Validate vector column exists
            if vector_column not in df.columns:
                raise ValueError(f"Vector column '{vector_column}' not found in CSV")
            
            # Convert string representations of vectors to actual lists
            vectors = df[vector_column].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) else x).tolist()
            
            # Prepare payload columns
            if payload_columns is None:
                payload_columns = []  # Empty list if no payload columns specified
            
            # Validate payload columns exist
            missing_columns = [col for col in payload_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Payload columns not found in CSV: {missing_columns}")
            
            # Create points with vectors and payloads
            points = [
                PointStruct(
                    id=i,
                    vector=vec,
                    payload={
                        col: str(df.iloc[i][col]) if isinstance(df.iloc[i][col], (str, object)) 
                        else float(df.iloc[i][col]) if isinstance(df.iloc[i][col], (float, np.float64))
                        else int(df.iloc[i][col])
                        for col in payload_columns
                    } if payload_columns else {}
                )
                for i, vec in enumerate(vectors)
            ]
            
            logging.info(f"Created {len(points)} points from CSV with {len(payload_columns)} payload columns")
            return points
            
        except FileNotFoundError:
            logging.error(f"CSV file not found: {csv_path}")
            raise
        except Exception as e:
            logging.error(f"Error creating points from CSV: {e}")
            raise