HONYED BAKERY
A full-stack e-commerce application for artisanal baked goods with a warm, inviting UI and robust backend functionality.

FEATURES

Frontend (React)
- Modern, responsive UI with React
- Product catalog with categories
- Shopping cart functionality
- User authentication
- Order management
- Admin dashboard

Backend (Node.js + Express)
- RESTful API architecture
- MongoDB database with Mongoose
- User authentication with JWT
- Product management
- Order processing
- Payment integration  
- File upload capabilities

QUICK START

Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm 
Installation
1. Clone the repository
2. Install backend dependencies
3. Configure environment variables
4. Install frontend dependencies



Installation
1.	Clone the repository
bash
git clone <repository-url>
cd honyed-bakery

2.	Install backend dependencies
bash
cd backend
npm install
npm install express mongoose dotenv cors bcryptjs jsonwebtoken multer

3.	Configure environment variables Create a .env file in the backend directory:

.env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development

The backend also accepts `MONGO_URI` for compatibility with older env files.

4.	Install frontend dependencies
bash
cd ../frontend
npm install

Backend Setup
bash
cd backend
node server.js

Frontend Setup

bash
cd frontend
npm start


PROJECT STRUCTURE
BackendLumiaLuxe/
- server.js
- models
- controllers
- routes
- middleware
- utils
- public/uploads

API ENDPOINTS
Authentication, Products, Orders, Categories, users 

DATABASE MODELS
User, Product, Order, Category

AUTHENTICATION
JWT-based authentication using Authorization header

DEPENDENCIES
Backend: Express, Mongoose, JWT, Multer
Frontend: React 
