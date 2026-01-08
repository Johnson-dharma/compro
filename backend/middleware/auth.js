const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized to access this route' }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: { message: 'User not found or inactive' }
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token is not valid' }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication error' }
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized to access this route' }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'User role is not authorized to access this route' }
      });
    }

    next();
  };
};

const isAdmin = authorize('admin');
const isEmployee = authorize('employee');
const isAdminOrSelf = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }
  
  if (req.user.id === req.params.id) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: { message: 'Not authorized to access this resource' }
  });
};

module.exports = {
  protect,
  authorize,
  isAdmin,
  isEmployee,
  isAdminOrSelf
};
