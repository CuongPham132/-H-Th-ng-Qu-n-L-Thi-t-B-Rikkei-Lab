const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', validate(validateRegister, 'body'), authController.register);
router.post('/login', validate(validateLogin, 'body'), authController.login);
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;
