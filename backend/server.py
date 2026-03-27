from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
import os
from dotenv import load_dotenv
import secrets
import hashlib
import smtplib
from email.message import EmailMessage

from database import (
    init_indexes, close_database, users_collection, products_collection,
    ingredients_collection, recipes_collection, sales_collection, notifications_collection
)
from models import (
    UserRegister, UserLogin, PasswordReset, VerifyCode, TokenReset, ProductCreate, ProductUpdate,
    IngredientCreate, IngredientUpdate, RecipeCreate, SaleCreate, UserResponse,
    ProductResponse, IngredientResponse, RecipeResponse, SaleResponse,
    DashboardStats, SalesTrendData, TopProduct, NotificationCreate, NotificationResponse,
    ManagerDashboardStats, SalesPerformance
)
from security import hash_password, verify_password, create_access_token, decode_token
from sms_service import send_verification_code, verify_code

load_dotenv()

# SMTP / frontend config for email fallback
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

# Initialize FastAPI app
app = FastAPI(title="Crusties API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _create_default_user(email: str, password: str, name: str, role: str):
    """Helper to ensure a user exists with the given role."""
    existing = await users_collection.find_one({"email": email})
    if existing:
        return
    hashed = hash_password(password)
    user = {
        "email": email,
        "name": name,
        "phone": "",
        "password": hashed,
        "role": role,
        "approved": True,  # auto‑approved for admin/manager
        "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(user)

# Event handlers
@app.on_event("startup")
async def startup():
    await init_indexes()
    try:
        await _create_default_user(
            os.getenv("DEFAULT_ADMIN_EMAIL", "admin@crusties.com"),
            os.getenv("DEFAULT_ADMIN_PASS", "Admin123"),
            "Administrator",
            "admin"
        )
        await _create_default_user(
            os.getenv("DEFAULT_MANAGER_EMAIL", "manager@crusties.com"),
            os.getenv("DEFAULT_MANAGER_PASS", "Manager123"),
            "Manager",
            "manager"
        )
    except Exception as e:
        print(f"Error creating default users: {e}")

@app.on_event("shutdown")
async def shutdown():
    await close_database()


# Dependency for getting current user
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.split(" ")[1]
    except IndexError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload


# ===== AUTH ENDPOINTS =====
@app.post("/api/auth/register")
async def register(user: UserRegister):
    """Register new user"""
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user.password)
    
    # Create user
    new_user = {
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "password": hashed_password,
        "role": "user",
        "approved": False,
        "created_at": datetime.utcnow()
    }
    
    result = await users_collection.insert_one(new_user)
    
    return {
        "id": str(result.inserted_id),
        "message": "User registered successfully. Awaiting admin approval."
    }


@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    """Login user"""
    # Find user
    user = await users_collection.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if approved
    if not user.get("approved") and user.get("role") == "user":
        raise HTTPException(status_code=403, detail="User not approved yet")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }


@app.post("/api/auth/reset-password")
async def request_password_reset(request: PasswordReset):
    """Request password reset via SMS"""
    user = await users_collection.find_one({"phone": request.phone})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Try sending SMS first (Twilio). If it fails, fall back to emailing a token link.
    try:
        success = await send_verification_code(request.phone)
    except Exception as e:
        print(f"send_verification_code raised: {e}")
        success = False

    if success:
        return {"message": "Verification code sent to your phone"}

    # SMS failed -> fallback to email token link
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = datetime.utcnow() + timedelta(hours=1)

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token_hash": token_hash, "reset_expires": expires}}
    )

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    # Try to send email fallback if configured
    email_sent = False
    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        try:
            send_email_reset_link(user.get("email"), reset_link)
            email_sent = True
        except Exception as e:
            print(f"Error sending email fallback: {e}")
            # Fall through to dev mode
    
    if email_sent:
        return {"message": "Verification sent via email fallback"}
    else:
        # If email not configured or failed, print token to log for dev/demo (like SMS fallback)
        print(f"[dev-email-token] password reset token for {user.get('email')}: {token}")
        print(f"[dev-email-token] reset link: {reset_link}")
        return {"message": "Verification sent via email link (dev mode - check logs)"}


def send_email_reset_link(to_email: str, link: str):
    """Send a simple password reset email using SMTP. Requires SMTP_* env vars."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        raise RuntimeError("SMTP not configured")

    msg = EmailMessage()
    msg["Subject"] = "Crusties: Password reset"
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg.set_content(f"Click the link to reset your password: {link}\nThis link expires in 1 hour.")

    # Port 587 uses SMTP with STARTTLS; 465 uses SMTP_SSL
    if SMTP_PORT == 587:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
    else:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)

@app.post("/api/auth/reset-password-token")
async def reset_password_with_token(data: TokenReset):
    """Confirm password reset using a token sent via email fallback"""
    try:
        token_hash = hashlib.sha256(data.token.encode()).hexdigest()
        now = datetime.utcnow()
        user = await users_collection.find_one({"reset_token_hash": token_hash, "reset_expires": {"$gt": now}})
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        hashed_password = hash_password(data.new_password)
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hashed_password}, "$unset": {"reset_token_hash": "", "reset_expires": ""}}
        )

        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in reset_password_with_token: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/auth/verify-code")
async def verify_reset_code(data: VerifyCode):
    """Verify SMS code and reset password"""
    # Verify code
    valid = await verify_code(data.phone, data.code)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    # Find user and update password
    user = await users_collection.find_one({"phone": data.phone})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    hashed_password = hash_password(data.new_password)
    
    # Update user
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Password reset successfully"}

@app.get("/api/users/pending")
async def get_pending_users(current_user: dict = Depends(get_current_user)):
    """Get pending user approvals (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await users_collection.find(
        {"role": "user", "approved": False}
    ).to_list(None)
    
    return [
        {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "phone": user["phone"],
            "created_at": user["created_at"]
        }
        for user in users
    ]

@app.post("/api/users/{user_id}/approve")
async def approve_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Approve user (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get user details before updating
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"approved": True}}
        )
        
        # Create notification for approved user
        notification = {
            "user_id": user_id,
            "title": "Account Approved",
            "message": f"Your account has been approved by the admin. You can now login to Crusties.",
            "type": "approval",
            "read": False,
            "created_at": datetime.utcnow()
        }
        await notifications_collection.insert_one(notification)
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User approved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.post("/api/users/{user_id}/reject")
async def reject_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Reject user (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get user details before deleting
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        result = await users_collection.delete_one({"_id": ObjectId(user_id)})
        
        # Create notification for rejected user
        notification = {
            "user_id": user_id,
            "title": "Account Rejected",
            "message": f"Your account registration has been rejected. Please contact support for more information.",
            "type": "rejection",
            "read": False,
            "created_at": datetime.utcnow()
        }
        await notifications_collection.insert_one(notification)
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User rejected"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.get("/api/products")
async def get_products():
    """Get all products"""
    products = await products_collection.find().to_list(None)
    return [
        {
            "id": str(p["_id"]),
            "name": p["name"],
            "price": p["price"],
            "stock": p["stock"],
            "image_url": p["image_url"],
            "created_at": p["created_at"]
        }
        for p in products
    ]

@app.post("/api/products")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    """Create product (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_product = {
        **product.dict(),
        "created_at": datetime.utcnow()
    }
    
    result = await products_collection.insert_one(new_product)
    
    return {
        "id": str(result.inserted_id),
        "message": "Product created successfully"
    }

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    """Update product (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        update_data = {k: v for k, v in product.dict().items() if v is not None}
        result = await products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete product (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = await products_collection.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.get("/api/ingredients")
async def get_ingredients():
    """Get all ingredients"""
    ingredients = await ingredients_collection.find().to_list(None)
    return [
        {
            "id": str(i["_id"]),
            "name": i["name"],
            "unit": i["unit"],
            "quantity": i["quantity"],
            "created_at": i["created_at"]
        }
        for i in ingredients
    ]

@app.post("/api/ingredients")
async def create_ingredient(ingredient: IngredientCreate, current_user: dict = Depends(get_current_user)):
    """Create ingredient (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_ingredient = {
        **ingredient.dict(),
        "created_at": datetime.utcnow()
    }
    
    result = await ingredients_collection.insert_one(new_ingredient)
    
    return {
        "id": str(result.inserted_id),
        "message": "Ingredient created successfully"
    }

@app.put("/api/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: str, ingredient: IngredientUpdate, current_user: dict = Depends(get_current_user)):
    """Update ingredient (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        update_data = {k: v for k, v in ingredient.dict().items() if v is not None}
        result = await ingredients_collection.update_one(
            {"_id": ObjectId(ingredient_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ingredient not found")
        return {"message": "Ingredient updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid ingredient ID")

@app.delete("/api/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, current_user: dict = Depends(get_current_user)):
    """Delete ingredient (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = await ingredients_collection.delete_one({"_id": ObjectId(ingredient_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Ingredient not found")
        return {"message": "Ingredient deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid ingredient ID")

@app.get("/api/recipes/{product_id}")
async def get_recipe(product_id: str):
    """Get recipe for product"""
    try:
        recipe = await recipes_collection.find_one({"product_id": product_id})
        if not recipe:
            return {"message": "No recipe found for this product"}
        return {
            "id": str(recipe["_id"]),
            "product_id": recipe["product_id"],
            "ingredients": recipe["ingredients"],
            "created_at": recipe["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.post("/api/recipes")
async def create_recipe(recipe: RecipeCreate, current_user: dict = Depends(get_current_user)):
    """Create or update recipe (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if recipe exists
    existing_recipe = await recipes_collection.find_one({"product_id": recipe.product_id})
    
    recipe_data = {
        **recipe.dict(),
        "created_at": datetime.utcnow()
    }
    
    if existing_recipe:
        await recipes_collection.update_one(
            {"_id": existing_recipe["_id"]},
            {"$set": recipe_data}
        )
        return {"message": "Recipe updated"}
    else:
        result = await recipes_collection.insert_one(recipe_data)
        return {
            "id": str(result.inserted_id),
            "message": "Recipe created successfully"
        }

@app.get("/api/sales")
async def get_sales(current_user: dict = Depends(get_current_user)):
    """Get sales (filtered by role)"""
    if current_user.get("role") == "admin":
        sales = await sales_collection.find().sort("created_at", -1).to_list(None)
    else:
        sales = await sales_collection.find(
            {"user_id": current_user.get("user_id")}
        ).sort("created_at", -1).to_list(None)
    
    return [
        {
            "id": str(s["_id"]),
            "user_id": s["user_id"],
            "user_name": s["user_name"],
            "items": s["items"],
            "total": s["total"],
            "created_at": s["created_at"]
        }
        for s in sales
    ]

@app.post("/api/sales")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    """Record new sale"""
    if not sale.items:
        raise HTTPException(status_code=400, detail="Sale must contain items")
    
    # Validate stock availability
    for item in sale.items:
        product = await products_collection.find_one({"_id": ObjectId(item.product_id)})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product["stock"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
    
    # Deduct product stock and ingredients
    total = 0
    for item in sale.items:
        # Update product stock
        await products_collection.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock": -item.quantity}}
        )
        
        # Check for recipe and deduct ingredients
        recipe = await recipes_collection.find_one({"product_id": item.product_id})
        if recipe:
            for recipe_ingredient in recipe["ingredients"]:
                await ingredients_collection.update_one(
                    {"_id": ObjectId(recipe_ingredient["ingredient_id"])},
                    {"$inc": {"quantity": -(recipe_ingredient["quantity"] * item.quantity)}}
                )
        
        total += item.price * item.quantity
    
    # Get user info
    user = await users_collection.find_one({"_id": ObjectId(current_user.get("user_id"))})
    
    # Create sale record
    new_sale = {
        "user_id": current_user.get("user_id"),
        "user_name": user.get("name", "Unknown"),
        "items": [item.dict() for item in sale.items],
        "total": total,
        "created_at": datetime.utcnow()
    }
    
    result = await sales_collection.insert_one(new_sale)
    
    return {
        "id": str(result.inserted_id),
        "message": "Sale recorded successfully",
        "total": total
    }

@app.get("/api/analytics/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's revenue
    today_sales = await sales_collection.find(
        {"created_at": {"$gte": today}}
    ).to_list(None)
    todays_revenue = sum(sale["total"] for sale in today_sales)
    
    # Orders today
    orders_today = len(today_sales)
    
    # Low stock count
    low_stock_count = await products_collection.count_documents({"stock": {"$lt": 10}})
    
    # Total products
    total_products = await products_collection.count_documents({})
    
    return {
        "todays_revenue": todays_revenue,
        "orders_today": orders_today,
        "low_stock_count": low_stock_count,
        "total_products": total_products
    }

@app.get("/api/analytics/trend")
async def get_sales_trend(days: int = 7, current_user: dict = Depends(get_current_user)):
    """Get sales trend data (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get sales from last N days
    start_date = datetime.utcnow() - timedelta(days=days)
    sales = await sales_collection.find(
        {"created_at": {"$gte": start_date}}
    ).to_list(None)
    
    # Group by date
    trend_data = {}
    for sale in sales:
        date_key = sale["created_at"].strftime("%Y-%m-%d")
        trend_data[date_key] = trend_data.get(date_key, 0) + sale["total"]
    
    # Format response
    result = [
        {"date": date, "revenue": revenue}
        for date, revenue in sorted(trend_data.items())
    ]
    
    return result

@app.get("/api/analytics/top-products")
async def get_top_products(limit: int = 5, current_user: dict = Depends(get_current_user)):
    """Get best selling products (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all sales
    sales = await sales_collection.find().to_list(None)
    
    # Aggregate sales by product
    product_stats = {}
    for sale in sales:
        for item in sale["items"]:
            product_id = item["product_id"]
            if product_id not in product_stats:
                product_stats[product_id] = {
                    "name": item["product_name"],
                    "quantity": 0,
                    "revenue": 0
                }
            product_stats[product_id]["quantity"] += item["quantity"]
            product_stats[product_id]["revenue"] += item["price"] * item["quantity"]
    
    # Sort by quantity sold
    sorted_products = sorted(
        product_stats.items(),
        key=lambda x: x[1]["quantity"],
        reverse=True
    )[:limit]
    
    return [
        {
            "product_id": product_id,
            "product_name": stats["name"],
            "quantity_sold": stats["quantity"],
            "revenue": stats["revenue"]
        }
        for product_id, stats in sorted_products
    ]

@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await notifications_collection.find(
        {"user_id": current_user.get("id")}
    ).sort("created_at", -1).to_list(None)
    
    return [
        {
            "id": str(notif["_id"]),
            "title": notif["title"],
            "message": notif["message"],
            "type": notif["type"],
            "read": notif.get("read", False),
            "created_at": notif["created_at"]
        }
        for notif in notifications
    ]

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    try:
        result = await notifications_collection.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": current_user.get("id")
            },
            {"$set": {"read": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

@app.get("/api/manager/analytics/dashboard")
async def get_manager_dashboard(current_user: dict = Depends(get_current_user)):
    """Get manager dashboard statistics (Manager only)"""
    if current_user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Total revenue (all time)
    all_sales = await sales_collection.find().to_list(None)
    total_revenue = sum(sale["total"] for sale in all_sales)
    total_sales = len(all_sales)
    
    # Total approved users
    total_users = await users_collection.count_documents(
        {"role": "user", "approved": True}
    )
    
    # Top products
    product_stats = {}
    for sale in all_sales:
        for item in sale["items"]:
            product_id = item["product_id"]
            if product_id not in product_stats:
                product_stats[product_id] = {
                    "name": item["product_name"],
                    "quantity": 0,
                    "revenue": 0
                }
            product_stats[product_id]["quantity"] += item["quantity"]
            product_stats[product_id]["revenue"] += item["price"] * item["quantity"]
    
    top_products = sorted(
        product_stats.items(),
        key=lambda x: x[1]["quantity"],
        reverse=True
    )[:5]
    
    top_products_list = [
        {
            "product_id": product_id,
            "product_name": stats["name"],
            "quantity_sold": stats["quantity"],
            "revenue": stats["revenue"]
        }
        for product_id, stats in top_products
    ]
    
    # Sales trend (last 30 days)
    start_date = datetime.utcnow() - timedelta(days=30)
    trend_sales = await sales_collection.find(
        {"created_at": {"$gte": start_date}}
    ).to_list(None)
    
    trend_data = {}
    for sale in trend_sales:
        date_key = sale["created_at"].strftime("%Y-%m-%d")
        trend_data[date_key] = trend_data.get(date_key, 0) + sale["total"]
    
    sales_trend = [
        {"date": date, "revenue": revenue}
        for date, revenue in sorted(trend_data.items())
    ]
    
    return {
        "total_revenue": total_revenue,
        "total_sales": total_sales,
        "total_users": total_users,
        "top_products": top_products_list,
        "sales_trend": sales_trend
    }

@app.get("/api/manager/analytics/sales-performance")
async def get_sales_performance(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get user sales performance analytics (Manager only)"""
    if current_user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get sales from last N days
    start_date = datetime.utcnow() - timedelta(days=days)
    sales = await sales_collection.find(
        {"created_at": {"$gte": start_date}}
    ).to_list(None)
    
    # Group by user
    user_stats = {}
    for sale in sales:
        user_id = sale.get("user_id")
        user_name = sale.get("user_name", "Unknown")
        if user_id not in user_stats:
            user_stats[user_id] = {
                "name": user_name,
                "total_sales": 0,
                "total_revenue": 0
            }
        user_stats[user_id]["total_sales"] += 1
        user_stats[user_id]["total_revenue"] += sale["total"]
    
    # Sort by revenue
    sorted_users = sorted(
        user_stats.items(),
        key=lambda x: x[1]["total_revenue"],
        reverse=True
    )
    
    return [
        {
            "user_id": user_id,
            "user_name": stats["name"],
            "total_sales": stats["total_sales"],
            "total_revenue": stats["total_revenue"]
        }
        for user_id, stats in sorted_users
    ]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
