const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const {
  validateCreateUser,
  validateUpdateStatus,
  validateUpdateRole,
  validateUserQuery,
} = require('../validators/user.validator');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../constants/roles');

// All endpoints in /api/users require authentication and ADMIN role
router.use(authMiddleware, requireRoles(ROLES.ADMIN));

router.get('/', validate(validateUserQuery, 'query'), userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', validate(validateCreateUser, 'body'), userController.createUser);
router.patch('/:id/status', validate(validateUpdateStatus, 'body'), userController.updateStatus);
router.patch('/:id/role', validate(validateUpdateRole, 'body'), userController.updateRole);

module.exports = router;
