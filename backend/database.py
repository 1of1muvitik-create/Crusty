import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

# Use MONGO_URL for Emergent compatibility, fallback to MONGODB_URL
MONGODB_URL = os.environ.get("MONGO_URL") or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DB_NAME") or os.getenv("DATABASE_NAME", "crusties_db")

client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=5000
)
database = client[DATABASE_NAME]

# Collections
users_collection = database.get_collection("users")
products_collection = database.get_collection("products")
ingredients_collection = database.get_collection("ingredients")
recipes_collection = database.get_collection("recipes")
sales_collection = database.get_collection("sales")
notifications_collection = database.get_collection("notifications")


async def init_indexes():
    """Initialize database indexes for performance"""
    try:
        # Users indexes
        await users_collection.create_index("email", unique=True)
        await users_collection.create_index("role")
        await users_collection.create_index("approved")
        
        # Products indexes
        await products_collection.create_index("name")
        
        # Ingredients indexes
        await ingredients_collection.create_index("name")
        
        # Recipes indexes
        await recipes_collection.create_index("product_id")
        
        # Sales indexes
        await sales_collection.create_index("user_id")
        await sales_collection.create_index("created_at")
        
        # Notifications indexes
        await notifications_collection.create_index("user_id")
        await notifications_collection.create_index("created_at")
        await notifications_collection.create_index("read")
        
        print("Database indexes initialized successfully")
    except Exception as e:
        print(f"Error initializing indexes: {e}")


async def close_database():
    """Close database connection"""
    client.close()
