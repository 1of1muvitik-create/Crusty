# Docker Setup Guide for Crusties System

This guide explains how to run the Crusties Food Vending Management System using Docker.

## Prerequisites

- **Docker** (version 20.10+)
- **Docker Compose** (version 1.29+)

Install Docker Desktop from: https://www.docker.com/products/docker-desktop

## Quick Start

### 1. Build and Start All Services

From the project root directory (`crusties-system/`), run:

```bash
docker-compose up --build
```

This command will:
- Build Docker images for the backend and frontend
- Start MongoDB database
- Start the FastAPI backend server
- Start the React frontend application
- Create a shared network for service communication

### 2. Access the Application

The services will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **MongoDB**: localhost:27017 (internal only)

### 3. Default Credentials

The system creates default users on startup:

**Admin Account:**
- Email: `admin@crusties.com`
- Password: `Admin123`

**Manager Account:**
- Email: `manager@crusties.com`
- Password: `Manager123`

## Detailed Commands

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Stop Services

```bash
# Stop services (keep containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v
```

### Rebuild Services

```bash
# Rebuild without cache
docker-compose build --no-cache

# Rebuild and restart specific service
docker-compose up -d --build backend
```

## Service Details

### Backend (FastAPI)

- **Port**: 8001
- **Framework**: FastAPI with Uvicorn
- **Database**: MongoDB (auto-connected)
- **Features**:
  - Authentication with JWT
  - User management with roles (admin, manager, user)
  - Product and ingredient management
  - Sales tracking
  - SMS verification support

**Environment Variables**:
```
MONGO_URL: mongodb://admin:admin123@mongodb:27017
DB_NAME: crusties_db
JWT_SECRET_KEY: (configured in docker-compose.yml)
FRONTEND_URL: http://localhost:3000
```

### Frontend (React)

- **Port**: 3000
- **Framework**: React 19
- **Build Tool**: Create React App
- **Running**: Served with `serve` in production

**Environment Variables**:
```
REACT_APP_BACKEND_URL: http://localhost:8001
REACT_APP_ENV: production
REACT_APP_API_TIMEOUT: 30000
```

### Database (MongoDB)

- **Port**: 27017
- **Version**: 7.0
- **Admin Username**: admin
- **Admin Password**: admin123
- **Database**: crusties_db
- **Storage**: volumes (`mongodb_data`, `mongodb_config`)

## Development Tips

### 1. Modify Backend Code

If you change backend code while containers are running:

```bash
docker-compose up -d --build backend
```

The backend will restart automatically with the new code.

### 2. Modify Frontend Code

For fastest development, consider running the frontend locally instead:

```bash
# Stop the Docker frontend
docker-compose down

# Run frontend locally in development mode
cd frontend
npm start
```

The React development server supports hot-reload.

### 3. Access MongoDB

To inspect or manage the database:

```bash
# Using MongoDB Shell
docker exec -it crusties-mongodb mongosh -u admin -p admin123 -n crusties_db

# Or use MongoDB Compass GUI (connect to: mongodb://admin:admin123@localhost:27017/)
```

## Troubleshooting

### MongoDB Connection Error

If the backend can't connect to MongoDB, ensure:
- MongoDB container is healthy: `docker ps` and check STATUS
- Wait 40+ seconds after starting for MongoDB to be ready
- Check logs: `docker-compose logs mongodb`

### Port Already in Use

If ports 3000, 8001, or 27017 are already in use:

Edit `docker-compose.yml` and change the port mappings:
```yaml
ports:
  - "3001:3000"  # Frontend
  - "8002:8001"  # Backend
  - "27018:27017"  # MongoDB
```

### Frontend React Errors

Clear the frontend build cache:
```bash
docker-compose down
rm -rf frontend/build frontend/node_modules
docker-compose up --build
```

### Backend Module Not Found

Ensure dependencies are properly installed:
```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up
```

## Performance Optimization

### Set Resource Limits

Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### Use Production Settings

For production deployment:
1. Change `FRONTEND_URL` and `REACT_APP_BACKEND_URL` to your domain
2. Update `JWT_SECRET_KEY` to a strong random value
3. Enable CORS restrictions: set `CORS_ORIGINS` instead of "*"

## Deployment Notes

### Building Images for Different Architectures

```bash
# For ARM64 (Apple Silicon, ARM servers)
docker-compose build --platform linux/arm64

# For AMD64 (Standard Linux/Windows servers)
docker-compose build --platform linux/amd64
```

### Pushing to Docker Registry

```bash
# Tag images
docker tag crusties-backend:latest your-registry/crusties-backend:latest
docker tag crusties-frontend:latest your-registry/crusties-frontend:latest

# Push to registry
docker push your-registry/crusties-backend:latest
docker push your-registry/crusties-frontend:latest
```

## Health Checks

The Docker setup includes health checks:
- MongoDB checks every 10 seconds
- Backend checks every 30 seconds
- Frontend checks every 30 seconds

View health status:
```bash
docker-compose ps
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [React Production Build](https://create-react-app.dev/docs/production-build/)
