import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGODB_URI")
database_name = os.getenv("DATABASE_NAME")

if not uri or not database_name:
    raise ValueError("MongoDB configuration missing in .env")

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)

    client.admin.command("ping")

    db = client[database_name]
    collection = db["conversations"]

    print("MongoDB Atlas connected successfully!")
    print("Database:", database_name)
    print("Collection:", collection.name)

    client.close()

except Exception as error:
    print("MongoDB connection failed:", error)
