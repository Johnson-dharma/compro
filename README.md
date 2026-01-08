# Attendance Management System

A modern, full-stack attendance management system built with the PERN stack (PostgreSQL, Express.js, React, Node.js) featuring photo verification and real-time tracking.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin/Employee)
  - Password reset functionality
  - Secure session management

- **Attendance Tracking**
  - Photo-based clock-in/out system
  - GPS location verification
  - Working hours calculation
  - Overtime tracking

- **Admin Dashboard**
  - Real-time attendance overview
  - Employee management
  - Comprehensive reporting

- **Employee Dashboard**
  - Personal attendance status
  - Clock-in/out interface
  - Attendance history
  - Profile management

### Technical Features
- **Responsive Design**
  - Mobile-first approach
  - Dark/Light theme support
  - Modern UI/UX with TailwindCSS

- **Real-time Updates**
  - Live attendance monitoring
  - Instant notifications

- **Security Features**
  - JWT authentication
  - Password hashing with bcrypt
  - Rate limiting
  - CORS protection
  - Input validation

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT + bcrypt
- **File Storage**: Database (Base64)
- **Validation**: Express-validator

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Context + React Query
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Forms**: React Hook Form

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **Type Checking**: TypeScript
- **Hot Reload**: Vite HMR

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **PostgreSQL** (v12 or higher)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies
npm run install-all
```

### 2. Environment Configuration

Create `.env` files in both `backend` and `frontend` directories with your configuration.

### 3. Database Setup

```bash
# Run database migrations
cd backend
npm run db:migrate
```

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build && cd backend && npm start
```

## 📱 Usage

### First Time Setup

1. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

2. **Create Admin Account**
   - Register the first admin user through the application
   - Configure system settings

3. **Add Employees**
   - Use admin panel to create employee accounts
   - Set departments and roles

### Daily Operations

1. **Employee Clock-in/out**
   - Take photo using mobile device
   - Submit with GPS location
   - System validates location and time

2. **Admin Monitoring**
   - View real-time attendance dashboard
   - Monitor attendance records
   - Generate reports

3. **Reporting**
   - Export attendance data
   - Generate department reports
   - Track working hours and overtime

## 🏗️ Project Structure

```
attendance-management-system/
├── backend/                 # Express.js server
│   ├── config/             # Database configuration
│   ├── middleware/         # Custom middleware
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # API utilities
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── index.html          # HTML template
│   ├── tailwind.config.js  # TailwindCSS config
│   └── package.json        # Frontend dependencies
├── package.json            # Root dependencies
└── README.md              # Project documentation
```

## 🔧 Configuration

### Database Configuration

The system supports multiple database environments:

- **Development**: Local PostgreSQL instance
- **Production**: Cloud PostgreSQL with SSL

### Email Configuration

- **SMTP Support**: Gmail, Outlook, custom SMTP
- **Templates**: HTML email templates
- **Notifications**: Password reset, attendance alerts

## 🚀 Deployment

### Backend Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   PORT=5000
   ```

2. **Database Migration**
   ```bash
   npm run db:migrate
   ```

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name attendance-api
   ```

### Frontend Deployment

1. **Build Production**
   ```bash
   npm run build
   ```

2. **Serve Static Files**
   ```bash
   # Using nginx or Apache
   # Copy dist/ folder to web server
   ```

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

### API Testing

Use tools like Postman or Insomnia to test the API endpoints:

- **Base URL**: http://localhost:5000/api
- **Authentication**: Bearer token in Authorization header
- **Documentation**: API endpoints documented in route files

## 🔒 Security Considerations

- **JWT Tokens**: Secure token storage and rotation
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Proper CORS configuration for production
- **Environment Variables**: Secure configuration management

## 📊 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Image Compression**: Automatic image optimization
- **Caching**: React Query for efficient data fetching
- **Lazy Loading**: Code splitting and lazy component loading
- **CDN**: Cloudinary for image delivery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the inline code comments
- **Community**: Join our discussion forum

## 🔮 Future Enhancements

- **Mobile App**: Native iOS/Android applications
- **Advanced Analytics**: Machine learning insights
- **Integration APIs**: HR system integrations
- **Multi-language Support**: Internationalization
- **Advanced Reporting**: Custom report builder

---

**Built with ❤️ using modern web technologies**

