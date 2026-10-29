
import os

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "TrafficAI")

if not MONGODB_URI:
    raise ValueError(
        "MONGODB_URI is missing. Check your .env file."
    )

client = MongoClient(
    MONGODB_URI,
    server_api=ServerApi("1"),
    serverSelectionTimeoutMS=10000,
)

db = client[DATABASE_NAME]

# Collections for the TrafficAI project
vehicles = db["vehicles"]
violations = db["violations"]
detections = db["detections"]
image_embeddings = db["image_embeddings"]


def test_connection():
    check_database_connection()
    print("MongoDB connection successful!")
    print(f"Database: {DATABASE_NAME}")
    print("Collections ready to use.")


def check_database_connection():
    try:
        return client.admin.command("ping")
    except Exception as error:
        print("MongoDB connection failed.")
        print(f"Error: {error}")
        raise


if __name__ == "__main__":
    test_connection()
    client.close()
