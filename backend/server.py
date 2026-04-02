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
import math

from database import (
    init_indexes, close_database, users_collection, products_collection,
    ingredients_collection, sales_collection, notifications_collection
)
from models import (
    UserRegister, AdminUserCreate, UserLogin, PasswordResetEmail, TokenReset,
    ProductCreate, ProductUpdate,
    IngredientCreate, IngredientUpdate, RecipeCreate, SaleCreate, UserResponse,
    ProductResponse, IngredientResponse, RecipeResponse, SaleResponse,
    DashboardStats, SalesTrendData, TopProduct, NotificationCreate, NotificationResponse,
    ManagerDashboardStats, SalesPerformance
)
from security import hash_password, verify_password, create_access_token, decode_token
from email_service import send_reset_email, send_user_notification

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app = FastAPI(title="Crusties API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def _create_default_user(email: str, password: str, name: str, role: str):
    existing = await users_collection.find_one({"email": email})
    if existing:
        return
    hashed = hash_password(password)
    user = {
        "email": email, "name": name, "phone": "", "password": hashed,
        "role": role, "approved": True, "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(user)

@app.on_event("startup")
async def startup():
    await init_indexes()
    try:
        await _create_default_user(
            os.getenv("DEFAULT_ADMIN_EMAIL", "admin@crusties.com"),
            os.getenv("DEFAULT_ADMIN_PASS", "Admin123"),
            "Administrator", "admin"
        )
        await _create_default_user(
            os.getenv("DEFAULT_MANAGER_EMAIL", "manager@crusties.com"),
            os.getenv("DEFAULT_MANAGER_PASS", "Manager123"),
            "Manager", "manager"
        )
    except Exception as e:
        print(f"Error creating default users: {e}")

@app.on_event("shutdown")
async def shutdown():
    await close_database()

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

# ===== AUTH =====

@app.post("/api/auth/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hash_password(user.password)
    new_user = {
        "email": user.email, "name": user.name, "phone": user.phone,
        "password": hashed_password, "role": "user",
        "approved": False, "suspended": False, "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(new_user)
    return {"id": str(result.inserted_id), "message": "User registered successfully. Awaiting admin approval."}

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = await users_collection.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Please contact the administrator.")
    if not user.get("approved") and user.get("role") == "user":
        raise HTTPException(status_code=403, detail="User not approved yet")
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    return {
        "access_token": token, "token_type": "bearer",
        "user": {"id": str(user["_id"]), "email": user["email"], "name": user["name"], "role": user["role"]}
    }

@app.post("/api/auth/reset-password")
async def request_password_reset(request: PasswordResetEmail):
    user = await users_collection.find_one({"email": request.email})
    if not user:
        print(f"[auth] reset password requested for unknown email: {request.email}")
        return {"message": "If that email exists, a verification code has been sent."}
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Suspended accounts cannot reset password")
    reset_code = ''.join(secrets.choice('0123456789') for _ in range(6))
    reset_code_hash = hashlib.sha256(reset_code.encode()).hexdigest()
    expires = datetime.utcnow() + timedelta(minutes=15)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_code_hash": reset_code_hash, "reset_code_expires": expires}}
    )
    email_sent = send_reset_email(user["email"], reset_code)
    if not email_sent:
        print(f"[dev] Password reset code for {user['email']}: {reset_code}")
        return {"message": "Verification code generated (check server logs — SMTP not configured yet)"}
    return {"message": "Verification code sent to your email."}

@app.post("/api/auth/reset-password-token")
async def reset_password_with_token(data: TokenReset):
    try:
        user = await users_collection.find_one({"email": data.email})
        if not user:
            raise HTTPException(status_code=400, detail="Invalid email or code")
        if user.get("suspended"):
            raise HTTPException(status_code=403, detail="Suspended accounts cannot reset password")
        expires = user.get("reset_code_expires")
        code_hash = user.get("reset_code_hash")
        if not code_hash or not expires or datetime.utcnow() > expires:
            raise HTTPException(status_code=400, detail="Invalid or expired reset code")
        if hashlib.sha256(data.token.encode()).hexdigest() != code_hash:
            raise HTTPException(status_code=400, detail="Invalid or expired reset code")
        hashed_password = hash_password(data.new_password)
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hashed_password}, "$unset": {"reset_code_hash": "", "reset_code_expires": ""}}
        )
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in reset_password_with_token: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ===== USERS =====

@app.get("/api/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await users_collection.find({"role": "user"}).to_list(None)
    return [
        {
            "id": str(user["_id"]), "email": user["email"], "name": user["name"],
            "phone": user.get("phone", ""), "approved": user.get("approved", False),
            "suspended": user.get("suspended", False), "created_at": user["created_at"]
        }
        for user in users
    ]

@app.get("/api/users/pending")
async def get_pending_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await users_collection.find({"role": "user", "approved": False}).to_list(None)
    return [
        {"id": str(u["_id"]), "email": u["email"], "name": u["name"], "phone": u.get("phone", ""), "created_at": u["created_at"]}
        for u in users
    ]

@app.post("/api/users")
async def create_user(user: AdminUserCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    existing_passwords = await users_collection.find({}, {"password": 1}).to_list(None)
    for existing in existing_passwords:
        if verify_password(user.password, existing["password"]):
            raise HTTPException(
                status_code=400,
                detail="This password is already being used by another account. Choose a unique password."
            )

    hashed_password = hash_password(user.password)
    new_user = {
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "password": hashed_password,
        "role": "user",
        "approved": True,
        "suspended": False,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(new_user)
    notification_sent = send_user_notification(
        to_email=user.email, to_name=user.name,
        subject="Your Crusties account is ready",
        heading="Account created",
        body=(
            f"Hi {user.name},<br><br>Your Crusties account has been created by an administrator.<br>"
            f"Use the password provided by your administrator to sign in.<br><br>"
            f"You can change your password after logging in."
        ),
        action_label="Login now",
        action_url=f"{FRONTEND_URL}/login"
    )
    return {
        "id": str(result.inserted_id),
        "message": "User created successfully",
        "email_sent": notification_sent
    }

@app.post("/api/users/{user_id}/approve")
async def approve_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"approved": True}})
        await notifications_collection.insert_one({
            "user_id": user_id, "title": "Account Approved",
            "message": "Your account has been approved. You can now log in to Crusties.",
            "type": "approval", "read": False, "created_at": datetime.utcnow()
        })
        send_user_notification(
            to_email=user["email"], to_name=user["name"],
            subject="Your Crusties account has been approved ✅",
            heading="You're in!",
            body=f"Hi {user['name']},<br><br>Your Crusties account has been <strong>approved</strong> by the administrator.<br>You can now log in and start using the system.",
            action_label="Log In now", action_url=f"{FRONTEND_URL}/login"
        )
        return {"message": "User approved"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.post("/api/users/{user_id}/reject")
async def reject_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        send_user_notification(
            to_email=user["email"], to_name=user["name"],
            subject="Update on your Crusties account application",
            heading="Application Not Approved",
            body=f"Hi {user['name']},<br><br>Unfortunately, your Crusties account registration has been <strong>rejected</strong>.<br>if you believe this is a mistake, please contact your administrator.",
            action_label=None, action_url=None
        )
        await users_collection.delete_one({"_id": ObjectId(user_id)})
        return {"message": "User rejected"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.post("/api/users/{user_id}/suspend")
async def suspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"suspended": True}})
        await notifications_collection.insert_one({
            "user_id": user_id, "title": "Account Suspended",
            "message": "Your account has been temporarily suspended. Please contact the administrator.",
            "type": "system", "read": False, "created_at": datetime.utcnow()
        })
        send_user_notification(
            to_email=user["email"], to_name=user["name"],
            subject="Your Crusties account has been suspended",
            heading="Account Suspended",
            body=f"Hi {user['name']},<br><br>Your Crusties account has been <strong>temporarily suspended</strong> by the administrator.<br>You will not be able to log in until your account is reactivated.<br><br>if you believe this is an error, please contact your administrator.",
            action_label=None, action_url=None
        )
        return {"message": "User suspended"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.post("/api/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"suspended": False}})
        await notifications_collection.insert_one({
            "user_id": user_id, "title": "Account Reactivated",
            "message": "Your account has been reactivated. You can now log in to Crusties.",
            "type": "system", "read": False, "created_at": datetime.utcnow()
        })
        send_user_notification(
            to_email=user["email"], to_name=user["name"],
            subject="Your Crusties account has been reactivated ✅",
            heading="Account Reactivated",
            body=f"Hi {user['name']},<br><br>Good news! Your Crusties account has been <strong>reactivated</strong>.<br>You can now log in and use the system as normal.",
            action_label="Log In now", action_url=f"{FRONTEND_URL}/login"
        )
        return {"message": "User reactivated"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if str(user["_id"]) == current_user.get("user_id"):
            raise HTTPException(status_code=400, detail="You cannot delete your own account")
        send_user_notification(
            to_email=user["email"], to_name=user["name"],
            subject="Your Crusties account has been removed",
            heading="Account Removed",
            body=f"Hi {user['name']},<br><br>Your Crusties account has been <strong>permanently removed</strong> from the system.<br>if you believe this is a mistake, please contact your administrator directly.",
            action_label=None, action_url=None
        )
        await users_collection.delete_one({"_id": ObjectId(user_id)})
        return {"message": "User permanently deleted"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

# ===== PRODUCTS =====

async def calculate_available_quantity(product):
    recipe = product.get("recipe") or []
    if not recipe:
        return 0
    quantities = []
    for item in recipe:
        try:
            ingredient = await ingredients_collection.find_one({"_id": ObjectId(item["ingredient_id"])})
        except Exception:
            return 0
        if not ingredient or ingredient.get("quantity", 0) <= 0 or item["quantity"] <= 0:
            return 0
        possible = math.floor(ingredient["quantity"] / item["quantity"])
        quantities.append(possible)
    return min(quantities) if quantities else 0

@app.get("/api/products")
async def get_products():
    products = await products_collection.find().to_list(None)
    product_list = []
    for p in products:
        product_list.append({
            "id": str(p["_id"]),
            "name": p["name"],
            "price": p["price"],
            "image_url": p["image_url"],
            "recipe": p.get("recipe", []),
            "available_quantity": await calculate_available_quantity(p),
            "created_at": p["created_at"]
        })
    return product_list

@app.get("/api/products/{product_id}/available")
async def get_product_available(product_id: str):
    try:
        product = await products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        available_quantity = await calculate_available_quantity(product)
        return {"product_id": product_id, "available_quantity": available_quantity}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.post("/api/products")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    product_data = product.dict()
    if product_data.get("recipe") is None:
        product_data.pop("recipe", None)
    else:
        product_data["recipe"] = product_data["recipe"] or []
    new_product = {**product_data, "created_at": datetime.utcnow()}
    result = await products_collection.insert_one(new_product)
    return {"id": str(result.inserted_id), "message": "Product created successfully"}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        update_data = {k: v for k, v in product.dict().items() if v is not None}
        if "recipe" in update_data:
            update_data["recipe"] = update_data["recipe"] or []
        result = await products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product updated"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        result = await products_collection.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

# ===== INGREDIENTS =====

@app.get("/api/ingredients")
async def get_ingredients():
    ingredients = await ingredients_collection.find().to_list(None)
    return [
        {"id": str(i["_id"]), "name": i["name"], "unit": i["unit"],
         "quantity": i["quantity"], "created_at": i["created_at"]}
        for i in ingredients
    ]

@app.post("/api/ingredients")
async def create_ingredient(ingredient: IngredientCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    new_ingredient = {**ingredient.dict(), "created_at": datetime.utcnow()}
    result = await ingredients_collection.insert_one(new_ingredient)
    return {"id": str(result.inserted_id), "message": "Ingredient created successfully"}

@app.put("/api/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: str, ingredient: IngredientUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        update_data = {k: v for k, v in ingredient.dict().items() if v is not None}
        result = await ingredients_collection.update_one({"_id": ObjectId(ingredient_id)}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ingredient not found")
        return {"message": "Ingredient updated"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ingredient ID")

@app.delete("/api/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        result = await ingredients_collection.delete_one({"_id": ObjectId(ingredient_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Ingredient not found")
        return {"message": "Ingredient deleted"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ingredient ID")

# ===== RECIPES =====

@app.get("/api/recipes/{product_id}")
async def get_recipe(product_id: str):
    try:
        product = await products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        recipe = product.get("recipe", [])
        return {"id": product_id, "product_id": product_id,
                "ingredients": recipe, "created_at": product["created_at"]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

@app.post("/api/recipes")
async def create_recipe(recipe: RecipeCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    if not recipe.ingredients:
        raise HTTPException(status_code=400, detail="Recipe must include at least one ingredient")
    try:
        product = await products_collection.find_one({"_id": ObjectId(recipe.product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        recipe_data = [ri.dict() for ri in recipe.ingredients]
        await products_collection.update_one(
            {"_id": ObjectId(recipe.product_id)},
            {"$set": {"recipe": recipe_data}}
        )
        return {"message": "Recipe saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e) or "Invalid product ID")

# ===== SALES =====

@app.get("/api/sales")
async def get_sales(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        sales = await sales_collection.find().sort("created_at", -1).to_list(None)
    else:
        sales = await sales_collection.find({"user_id": current_user.get("user_id")}).sort("created_at", -1).to_list(None)
    return [
        {"id": str(s["_id"]), "user_id": s["user_id"], "user_name": s["user_name"],
         "items": s["items"], "total": s["total"], "created_at": s["created_at"]}
        for s in sales
    ]

@app.post("/api/sales")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Sale must contain items")

    product_cache = {}
    for item in sale.items:
        if item.product_id not in product_cache:
            product_cache[item.product_id] = await products_collection.find_one({"_id": ObjectId(item.product_id)})
        product = product_cache[item.product_id]
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        recipe = product.get("recipe", [])
        if not recipe:
            raise HTTPException(status_code=400, detail=f"Product recipe not defined for {product['name']}")
        for ri in recipe:
            try:
                ingredient = await ingredients_collection.find_one({"_id": ObjectId(ri["ingredient_id"])})
            except Exception:
                ingredient = None
            if not ingredient:
                raise HTTPException(status_code=404, detail=f"Ingredient {ri['ingredient_id']} not found")
            required_qty = ri["quantity"] * item.quantity
            if ingredient.get("quantity", 0) < required_qty:
                raise HTTPException(status_code=400, detail=f"Insufficient ingredients for {product['name']}")

    total = 0
    for item in sale.items:
        product = product_cache[item.product_id]
        recipe = product.get("recipe", [])
        for ri in recipe:
            await ingredients_collection.update_one(
                {"_id": ObjectId(ri["ingredient_id"])},
                {"$inc": {"quantity": -(ri["quantity"] * item.quantity)}}
            )
        total += item.price * item.quantity

    user = await users_collection.find_one({"_id": ObjectId(current_user.get("user_id"))})
    new_sale = {
        "user_id": current_user.get("user_id"),
        "user_name": user.get("name", "Unknown"),
        "items": [item.dict() for item in sale.items],
        "total": total,
        "created_at": datetime.utcnow()
    }
    result = await sales_collection.insert_one(new_sale)
    return {"id": str(result.inserted_id), "message": "Sale recorded successfully", "total": total}

# ===== ANALYTICS =====

@app.get("/api/analytics/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sales = await sales_collection.find({"created_at": {"$gte": today}}).to_list(None)
    todays_revenue = sum(sale["total"] for sale in today_sales)
    orders_today = len(today_sales)
    low_stock_count = await ingredients_collection.count_documents({"quantity": {"$lt": 10}})
    total_products = await products_collection.count_documents({})
    return {"todays_revenue": todays_revenue, "orders_today": orders_today,
            "low_stock_count": low_stock_count, "total_products": total_products}

@app.get("/api/analytics/trend")
async def get_sales_trend(days: int = 7, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    start_date = datetime.utcnow() - timedelta(days=days)
    sales = await sales_collection.find({"created_at": {"$gte": start_date}}).to_list(None)
    trend_data = {}
    for sale in sales:
        date_key = sale["created_at"].strftime("%Y-%m-%d")
        trend_data[date_key] = trend_data.get(date_key, 0) + sale["total"]
    return [{"date": date, "revenue": revenue} for date, revenue in sorted(trend_data.items())]

@app.get("/api/analytics/top-products")
async def get_top_products(limit: int = 5, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    sales = await sales_collection.find().to_list(None)
    product_stats = {}
    for sale in sales:
        for item in sale["items"]:
            pid = item["product_id"]
            if pid not in product_stats:
                product_stats[pid] = {"name": item["product_name"], "quantity": 0, "revenue": 0}
            product_stats[pid]["quantity"] += item["quantity"]
            product_stats[pid]["revenue"] += item["price"] * item["quantity"]
    sorted_products = sorted(product_stats.items(), key=lambda x: x[1]["quantity"], reverse=True)[:limit]
    return [{"product_id": pid, "product_name": s["name"], "quantity_sold": s["quantity"], "revenue": s["revenue"]}
            for pid, s in sorted_products]

# ===== NOTIFICATIONS =====

@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await notifications_collection.find(
        {"user_id": current_user.get("id")}
    ).sort("created_at", -1).to_list(None)
    return [
        {"id": str(n["_id"]), "title": n["title"], "message": n["message"],
         "type": n["type"], "read": n.get("read", False), "created_at": n["created_at"]}
        for n in notifications
    ]

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await notifications_collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": current_user.get("id")},
            {"$set": {"read": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

# ===== MANAGER =====

@app.get("/api/manager/analytics/dashboard")
async def get_manager_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    all_sales = await sales_collection.find().to_list(None)
    total_revenue = sum(sale["total"] for sale in all_sales)
    total_sales = len(all_sales)
    total_users = await users_collection.count_documents({"role": "user", "approved": True})
    product_stats = {}
    for sale in all_sales:
        for item in sale["items"]:
            pid = item["product_id"]
            if pid not in product_stats:
                product_stats[pid] = {"name": item["product_name"], "quantity": 0, "revenue": 0}
            product_stats[pid]["quantity"] += item["quantity"]
            product_stats[pid]["revenue"] += item["price"] * item["quantity"]
    top_products = sorted(product_stats.items(), key=lambda x: x[1]["quantity"], reverse=True)[:5]
    top_products_list = [
        {"product_id": pid, "product_name": s["name"], "quantity_sold": s["quantity"], "revenue": s["revenue"]}
        for pid, s in top_products
    ]
    user_stats = {}
    for sale in all_sales:
        uid = sale.get("user_id")
        uname = sale.get("user_name", "Unknown")
        if uid not in user_stats:
            user_stats[uid] = {"name": uname, "total_sales": 0, "total_revenue": 0}
        user_stats[uid]["total_sales"] += 1
        user_stats[uid]["total_revenue"] += sale["total"]
    top_sellers = sorted(user_stats.items(), key=lambda x: x[1]["total_revenue"], reverse=True)[:5]
    top_sellers_list = [
        {"user_id": uid, "user_name": s["name"], "total_sales": s["total_sales"], "total_revenue": s["total_revenue"]}
        for uid, s in top_sellers
    ]
    start_date = datetime.utcnow() - timedelta(days=30)
    trend_sales = await sales_collection.find({"created_at": {"$gte": start_date}}).to_list(None)
    trend_data = {}
    for sale in trend_sales:
        date_key = sale["created_at"].strftime("%Y-%m-%d")
        trend_data[date_key] = trend_data.get(date_key, 0) + sale["total"]
    sales_trend = [{"date": d, "revenue": r} for d, r in sorted(trend_data.items())]
    return {
        "total_revenue": total_revenue,
        "total_sales": total_sales,
        "total_users": total_users,
        "top_products": top_products_list,
        "top_sellers": top_sellers_list,
        "sales_trend": sales_trend
    }

@app.get("/api/manager/users")
async def get_manager_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await users_collection.find({"role": "user"}).to_list(None)
    return [
        {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "phone": user.get("phone", ""),
            "approved": user.get("approved", False),
            "suspended": user.get("suspended", False),
            "created_at": user["created_at"]
        }
        for user in users
    ]

@app.get("/api/manager/analytics/sales-performance")
async def get_sales_performance(days: int = 30, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    start_date = datetime.utcnow() - timedelta(days=days)
    sales = await sales_collection.find({"created_at": {"$gte": start_date}}).to_list(None)
    user_stats = {}
    for sale in sales:
        uid = sale.get("user_id")
        uname = sale.get("user_name", "Unknown")
        if uid not in user_stats:
            user_stats[uid] = {"name": uname, "total_sales": 0, "total_revenue": 0}
        user_stats[uid]["total_sales"] += 1
        user_stats[uid]["total_revenue"] += sale["total"]
    sorted_users = sorted(user_stats.items(), key=lambda x: x[1]["total_revenue"], reverse=True)
    return [{"user_id": uid, "user_name": s["name"], "total_sales": s["total_sales"], "total_revenue": s["total_revenue"]}
            for uid, s in sorted_users]

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)

