#!/bin/bash

# Attendance Management System Installation Script
echo "🚀 Setting up Attendance Management System..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

if ! command_exists psql; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL v12 or higher."
    echo "   You can continue and set up the database later."
fi

echo "✅ Prerequisites check completed!"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files if they don't exist
echo "🔧 Setting up environment files..."

if [ ! -f backend/.env ]; then
    echo "📄 Creating backend/.env file..."
    cat > backend/.env << EOL
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d

# Cloudinary Configuration (for photo storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
EOL
    echo "✅ Created backend/.env file. Please update it with your configuration."
else
    echo "✅ Backend .env file already exists."
fi

if [ ! -f frontend/.env ]; then
    echo "📄 Creating frontend/.env file..."
    cat > frontend/.env << EOL
VITE_API_URL=http://localhost:5000/api
EOL
    echo "✅ Created frontend/.env file."
else
    echo "✅ Frontend .env file already exists."
fi

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Set up PostgreSQL database:"
echo "      CREATE DATABASE attendance_db;"
echo "      CREATE USER attendance_user WITH PASSWORD 'your_password';"
echo "      GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;"
echo ""
echo "   2. Update backend/.env with your database credentials"
echo ""
echo "   3. Run database migrations:"
echo "      cd backend && npm run db:migrate"
echo ""
echo "   4. Seed the database with sample data:"
echo "      cd backend && npm run db:seed"
echo ""
echo "   5. Start the development servers:"
echo "      npm run dev"
echo ""
echo "📝 Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:5000"
echo ""
echo "📚 For more information, check the README.md file."
