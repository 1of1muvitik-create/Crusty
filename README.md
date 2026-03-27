# Crusties - Food Vending Management System

A comprehensive full-stack application for managing food vending operations, sales tracking, and user management with role-based dashboards.

## 📦 Project Structure

```
crusties-system/
├── backend/          # FastAPI Python backend
│   ├── server.py     # Main FastAPI application
│   ├── database.py   # MongoDB connection & collections
│   ├── models.py     # Pydantic validation models
│   ├── security.py   # Password hashing & JWT auth
│   ├── sms_service.py # SMS verification service
│   ├── requirements.txt
│   └── .env          # Environment variables
└── frontend/         # React web application
    ├── public/       # Static files
    ├── src/
    │   ├── pages/    # Page components (Login, Dashboards)
    │   ├── components/ # Reusable UI components
    │   ├── context/   # React Context (AuthContext)
    │   ├── services/  # API client
    │   ├── hooks/     # Custom hooks
    │   ├── utils/     # Utilities (formatting)
    │   ├── App.js     # Main routing
    │   ├── index.js   # React entry point
    │   └── index.css  # Tailwind styles
    ├── package.json
    ├── tailwind.config.js
    ├── .env
    └── postcss.config.js
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ & npm/yarn
- **Python** 3.8+
- **MongoDB** (running locally or accessible)
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd crusties-system/backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `.env`:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=crusties
   JWT_SECRET_KEY=your-secret-key-here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_DAYS=7
   ```

4. Start the backend server:
   ```bash
   python server.py
   ```
   The API will be available at `http://localhost:8001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd crusties-system/frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   REACT_APP_ENV=development
   ```

4. Start the development server:
   ```bash
   npm start
   ```
   The app will open at `http://localhost:3000`

## 🔐 Default Credentials

The system automatically creates these default users on startup:

- **Admin Account**
  - Email: `admin@crusties.com`
  - Password: `Admin123`
  - Role: Admin

- **Manager Account**
  - Email: `manager@crusties.com`
  - Password: `Manager123`
  - Role: Manager

## 📋 Features

### Authentication
- User registration with phone number
- Email/password login
- Password reset with SMS code verification
- JWT-based authentication
- Role-based access control

### Admin Dashboard
- System overview & analytics
- User management (approve/reject/delete)
- Global sales analytics
- System settings & security configuration

### Manager Dashboard
- Sales trends with line graphs
- Top selling products
- User sales performance tracking
- Detailed analytics per salesperson
- Performance metrics & comparisons

### User Dashboard
- Personal sales statistics
- POS (Point of Sale) system
- Sales history & transaction records
- Personal analytics & charts
- Quick sales entry interface

### Core Features
- Product & ingredient inventory management
- Recipe creation and management
- Sales tracking with stock management
- Notifications & approval workflows
- Real-time analytics & reporting

## 🏗️ Technology Stack

### Backend
- **FastAPI** 0.110.1 - Modern async web framework
- **Motor** 3.3.1 - Async MongoDB driver
- **MongoDB** - NoSQL database
- **Python-Jose** - JWT authentication
- **BCrypt** - Password hashing
- **Pydantic** - Data validation

### Frontend
- **React** 19.0.0 - UI framework
- **React Router** v7.5.1 - Client-side routing
- **Tailwind CSS** 3.4.17 - Utility-first CSS
- **Axios** 1.8.4 - HTTP client
- **Recharts** 3.6.0 - Charts & graphs
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/verify-code` - Verify SMS code for password reset

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product (admin)
- `PUT /api/products/{id}` - Update product (admin)
- `DELETE /api/products/{id}` - Delete product (admin)

### Sales
- `POST /api/sales` - Record a sale
- `GET /api/sales` - Get user's sales
- `GET /api/admin/sales` - Get all sales (admin)

### Analytics
- `GET /api/manager/analytics/dashboard` - Manager dashboard stats
- `GET /api/manager/analytics/sales-performance` - Sales performance by user
<!-- admin analytics removed from UI; backend endpoints exist but not displayed -->

### Users
- `GET /api/admin/users` - List all users (admin)
- `PUT /api/admin/users/{id}/approve` - Approve user (admin)
- `DELETE /api/admin/users/{id}` - Delete user (admin)

## 🎯 User Roles & Permissions

### Admin
- Manage users (approve, reject, delete)
- Add products & ingredients to inventory
- Basic system settings
<!-- analytics page removed from admin interface -->

### Manager
- View all sales & analytics
- Track individual salesperson performance
- Generate performance reports
- View revenue trends

### User (Sales Person)
- Record sales through POS system
- View personal sales history
- Track personal revenue
- Submit for approval
- View personal analytics

## 🔄 Authentication Flow

1. **Login/Register**: User enters credentials
2. **JWT Token**: Server responds with access token
3. **Token Storage**: Token saved in localStorage
4. **API Requests**: All requests include `Authorization: Bearer {token}` header
5. **Token Validation**: Server validates token on each request
6. **Auto Logout**: On 401 response, user redirected to login

## 🗄️ Database Schema

### Collections
- **users** - User accounts with roles and approval status
- **products** - Menu items with pricing
- **ingredients** - Inventory items
- **recipes** - Product recipes with ingredients
- **sales** - Transaction records with timestamps
- **notifications** - User notifications & approvals

## 🛠️ Development Tips

### Hot Reload
- Backend: Restart `python server.py` after changes
- Frontend: Auto-reloads on file changes

### Console Logging
- Backend: Check terminal for debug logs
- Frontend: Browser DevTools console for errors

### API Testing
- Use tools like Postman or REST Client VS Code extension
- Base URL: `http://localhost:8001/api`

### Database
- Access MongoDB shell: `mongosh`
- View collections: `db.getCollection('users').find()`

## 🐛 Troubleshooting

### Port Already in Use
- Backend: Change `PORT` in `.env` or kill process on 8001
- Frontend: Change port with `PORT=3001 npm start`

### MongoDB Connection Error
- Ensure MongoDB is running: `mongosh`
- Check `MONGO_URL` in `.env`

### CORS Errors
- Check `frontend/.env` has correct `REACT_APP_BACKEND_URL`
- Backend may be down - verify it's running on 8001

### 401 Unauthorized
- Token may be expired
- Clear localStorage and login again
- Check `.env` JWT_SECRET_KEY matches on backend

## 📝 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=crusties
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7
PORT=8001
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENV=development
REACT_APP_API_TIMEOUT=30000
```

## 🚢 Deployment

### Backend
1. Set environment variables on host
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python server.py`

### Frontend
1. Build: `npm run build`
2. Serve `build/` directory with web server (nginx, Apache, etc.)
3. Ensure backend URL is correct in production

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend server logs
3. Check browser console for frontend errors
4. Verify all prerequisites are installed

## 📄 License

This project is proprietary software. All rights reserved.

## 👨‍💻 Development

Built with modern web technologies and best practices in mind. The application follows:
- RESTful API conventions
- Component-based architecture (React)
- Async/await patterns
- Role-based access control
- Responsive design with Tailwind CSS

Enjoy using Crusties! 🍴
