from app.db_drivers.qdrant_driver import QdrantDriver

# Dependency to get QdrantDriver instance
def get_qdrant_driver():
    return QdrantDriver()