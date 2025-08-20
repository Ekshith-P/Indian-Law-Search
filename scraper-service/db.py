from pymongo import MongoClient
import os

# Mongo URI can come from env vars (recommended)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)
db = client["indianlaw"]   # database
judgments = db["judgments"]  # collection
