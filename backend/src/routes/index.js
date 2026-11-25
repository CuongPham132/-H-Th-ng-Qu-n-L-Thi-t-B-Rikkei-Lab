const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const equipmentRoutes = require('./equipment.routes');
const borrowingRoutes = require('./borrowing.routes');
const { success } = require('../utils/apiResponse');

// Base API info
router.get('/', (req, res) => {
  return success(res, {
    service: 'Rikkei Lab Equipment Borrowing API',
    version: '1.0.0',
    status: 'Active',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      equipments: '/api/equipments',
      borrowings: '/api/borrowings',
    },
  }, 'Welcome to Rikkei Lab API');
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/equipments', equipmentRoutes);
router.use('/borrowings', borrowingRoutes);

module.exports = router;
