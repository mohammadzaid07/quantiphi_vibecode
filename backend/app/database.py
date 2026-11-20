from pymongo import MongoClient, DESCENDING
from pymongo.errors import PyMongoError
from app.config import MONGODB_URI, DATABASE_NAME

_client = None
_db = None

def get_database():
    global _client, _db
    if _db is not None:
        return _db
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is missing. Configure backend/.env.")
    _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
    _client.admin.command("ping")
    _db = _client[DATABASE_NAME]
    _db.conversations.create_index("conversation_id", unique=True)
    _db.conversations.create_index([("updated_at", DESCENDING)])
    return _db

def get_collection():
    return get_database().conversations

def check_database():
    try:
        get_database().command("ping")
        return True, "MongoDB connection successful"
    except Exception as exc:
        return False, str(exc)

def close_database():
    global _client, _db
    if _client is not None:
        _client.close()
    _client, _db = None, None
