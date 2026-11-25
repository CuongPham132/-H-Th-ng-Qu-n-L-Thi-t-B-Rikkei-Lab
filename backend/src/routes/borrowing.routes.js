const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowing.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { ROLES } = require('../constants/roles');
const {
  validateCreateBorrowing,
  validateBorrowingQuery,
  validateRejectBorrowing,
  validateHandoverBorrowing,
  validateReturnBorrowing,
} = require('../validators/borrowing.validator');

// All endpoints require valid JWT authentication
router.use(authMiddleware);

// UC08: Process expired approved borrowings (Staff / Admin)
router.post(
  '/process-expired',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  borrowingController.processExpired
);

// UC01: Create borrowing request (Borrower only)
router.post(
  '/',
  requireRoles(ROLES.BORROWER),
  validate(validateCreateBorrowing, 'body'),
  borrowingController.createBorrowing
);

// UC02: List borrowings (Borrower sees own, Staff/Admin sees all)
router.get(
  '/',
  validate(validateBorrowingQuery, 'query'),
  borrowingController.getBorrowings
);

// UC02: Detail borrowing
router.get('/:id', borrowingController.getBorrowingById);

// UC03: Cancel borrowing (Owner or Admin)
router.patch('/:id/cancel', borrowingController.cancelBorrowing);

// UC04: Approve borrowing (Staff / Admin)
router.patch(
  '/:id/approve',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  borrowingController.approveBorrowing
);

// UC05: Reject borrowing (Staff / Admin)
router.patch(
  '/:id/reject',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateRejectBorrowing, 'body'),
  borrowingController.rejectBorrowing
);

// UC06: Handover / Borrow equipment (Staff / Admin)
router.patch(
  '/:id/handover',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateHandoverBorrowing, 'body'),
  borrowingController.handoverBorrowing
);

// Alias: /:id/borrow
router.patch(
  '/:id/borrow',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateHandoverBorrowing, 'body'),
  borrowingController.handoverBorrowing
);

// UC07: Return equipment (Staff / Admin)
router.patch(
  '/:id/return',
  requireRoles(ROLES.ADMIN, ROLES.STAFF),
  validate(validateReturnBorrowing, 'body'),
  borrowingController.returnBorrowing
);

module.exports = router;
