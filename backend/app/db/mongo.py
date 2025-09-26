import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        _client = MongoClient(uri)
    return _client


def get_db():
    name = os.getenv('MONGODB_DB', 'avatar_assistant')
    return get_client()[name]
