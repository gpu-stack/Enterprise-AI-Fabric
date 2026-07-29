import json
import urllib.request
import urllib.error
from src.config import Config

class QdrantManager:
    def __init__(self):
        self.base_url = f"{Config.QDRANT_BASE_URL.rstrip('/')}/collections/{Config.COLLECTION_NAME}"
        self.client = Config.get_qdrant_client()

    def initialize_schema(self):
        self.initialize_collection()

    def initialize_collection(self):
        print(f"🛠️ Configuring schema collection framework for: '{Config.COLLECTION_NAME}'...")
        try:
            from qdrant_client import models
            exists = False
            try:
                col_info = self.client.get_collection(collection_name=Config.COLLECTION_NAME)
                if col_info:
                    exists = True
                    print(f"ℹ️ Collection '{Config.COLLECTION_NAME}' already exists in cluster layout.")
            except Exception:
                exists = False

            if not exists:
                self.client.create_collection(
                    collection_name=Config.COLLECTION_NAME,
                    vectors_config={
                        "dense": models.VectorParams(size=Config.VECTOR_DIMENSION, distance=models.Distance.COSINE)
                    },
                    sparse_vectors_config={
                        "sparse": models.SparseVectorParams(modifier=models.Modifier.IDF)
                    }
                )
                print(f"✅ Collection '{Config.COLLECTION_NAME}' initialized with dual dense & sparse schema.")
            self._create_tenant_payload_index()
        except Exception as e:
            print(f"❌ Schema execution error: {str(e)}")

    def _create_tenant_payload_index(self):
        try:
            res = self.client.create_payload_index(
                collection_name=Config.COLLECTION_NAME,
                field_name="tenant_id",
                field_schema={"type": "keyword", "is_tenant": True}
            )
            print(f"✅ HNSW tenant segmentation schema mapped: {res.status}")
        except Exception as e:
            print(f"❌ Index configuration fault: {str(e)}")

    def upsert_chunks(self, points):
        self.client.upsert(
            collection_name=Config.COLLECTION_NAME,
            points=points
        )

if __name__ == "__main__":
    manager = QdrantManager()
    manager.initialize_schema()