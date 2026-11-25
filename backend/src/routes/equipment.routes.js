const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { ROLES } = require('../constants/roles');
const {
  validateEquipmentQuery,
  validateCreateEquipment,
  validateUpdateEquipment,
  validateUpdateEquipmentStatus,
} = require('../validators/equipment.validator');

// All equipment endpoints require valid authentication
router.use(authMiddleware);

// 1. List equipments (Borrower, Staff, Admin)
router.get('/', validate(validateEquipmentQuery, 'query'), equipmentController.getEquipments);

// 2. Equipment detail (Borrower, Staff, Admin)
router.get('/:id', equipmentController.getEquipmentById);

// 3. Create equipment (Staff, Admin only)
router.post(
  '/',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateCreateEquipment, 'body'),
  equipmentController.createEquipment
);

// 4. Update equipment (Staff, Admin only)
router.put(
  '/:id',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateUpdateEquipment, 'body'),
  equipmentController.updateEquipment
);

// 5. Update equipment status (Staff, Admin only)
router.patch(
  '/:id/status',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateUpdateEquipmentStatus, 'body'),
  equipmentController.updateEquipmentStatus
);

module.exports = router;
