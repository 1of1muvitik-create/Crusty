from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema):
        schema.update({"type": "string"})
        return schema

# ===== Auth Models =====

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    phone: str
    password: str

class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Email-based password reset (replaces old phone/SMS models)
class PasswordResetEmail(BaseModel):
    email: EmailStr

class TokenReset(BaseModel):
    email: EmailStr
    token: str
    new_password: str

# ===== User Model =====

class UserBase(BaseModel):
    email: str
    name: str
    phone: str
    role: str = "user"
    approved: bool = False
    suspended: bool = False

class User(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True

class UserResponse(BaseModel):
    id: Optional[str] = Field(alias="_id")
    email: str
    name: str
    phone: str
    role: str
    approved: bool
    suspended: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True

# ===== Product Models =====

class ProductCreate(BaseModel):
    name: str
    price: float
    image_url: str
    recipe: List[RecipeIngredient] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    recipe: Optional[List[RecipeIngredient]] = None

class Product(ProductCreate):
    id: Optional[PyObjectId] = Field(alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True

class ProductResponse(BaseModel):
    id: Optional[str] = Field(alias="_id")
    name: str
    price: float
    image_url: str
    recipe: List[RecipeIngredient] = []
    available_quantity: int = 0
    created_at: datetime

    class Config:
        populate_by_name = True

# ===== Ingredient Models =====

class IngredientCreate(BaseModel):
    name: str
    unit: str
    quantity: float

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None

class Ingredient(IngredientCreate):
    id: Optional[PyObjectId] = Field(alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True

class IngredientResponse(BaseModel):
    id: Optional[str] = Field(alias="_id")
    name: str
    unit: str
    quantity: float
    created_at: datetime

    class Config:
        populate_by_name = True

# ===== Recipe Models =====

class RecipeIngredient(BaseModel):
    ingredient_id: str
    quantity: float

class RecipeCreate(BaseModel):
    product_id: str
    ingredients: List[RecipeIngredient]

class Recipe(RecipeCreate):
    id: Optional[PyObjectId] = Field(alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True

class RecipeResponse(BaseModel):
    id: Optional[str] = Field(alias="_id")
    product_id: str
    ingredients: List[RecipeIngredient]
    created_at: datetime

    class Config:
        populate_by_name = True

# ===== Sale Models =====

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class SaleCreate(BaseModel):
    items: List[SaleItem]

class Sale(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    user_id: str
    user_name: str
    items: List[SaleItem]
    total: float
    created_at: datetime

    class Config:
        populate_by_name = True

class SaleResponse(BaseModel):
    id: Optional[str] = Field(alias="_id")
    user_id: str
    user_name: str
    items: List[SaleItem]
    total: float
    created_at: datetime

    class Config:
        populate_by_name = True

# ===== Analytics Models =====

class DashboardStats(BaseModel):
    todays_revenue: float
    orders_today: int
    low_stock_count: int
    total_products: int

class SalesTrendData(BaseModel):
    date: str
    revenue: float

class TopProduct(BaseModel):
    product_id: str
    product_name: str
    quantity_sold: int
    revenue: float

# ===== Notification Models =====

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str

class NotificationResponse(BaseModel):
    id: Optional[str] = Field(alias="_id")
    user_id: str
    title: str
    message: str
    type: str
    read: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True

# ===== Manager Analytics Models =====

class SalesPerformance(BaseModel):
    date: str
    total_sales: int
    revenue: float
    top_user: str
    top_user_sales: int

class ManagerDashboardStats(BaseModel):
    total_revenue: float
    total_sales: int
    total_users: int
    top_products: List[TopProduct]
    sales_trend: List[SalesTrendData]
