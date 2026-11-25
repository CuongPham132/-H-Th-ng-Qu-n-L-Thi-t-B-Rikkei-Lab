const { error } = require('../utils/apiResponse');

/**
 * Higher-order middleware to validate incoming request data.
 * @param {Function} validatorFn - Function receiving data and returning { isValid, errors, value }
 * @param {'body'|'query'|'params'} [source='body']
 */
function validate(validatorFn, source = 'body') {
  return (req, res, next) => {
    const data = req[source] || {};
    const result = validatorFn(data);

    if (!result.isValid) {
      return error(res, 'Dữ liệu không hợp lệ', 400, result.errors);
    }

    if (result.value !== undefined) {
      req[source] = result.value;
    }

    next();
  };
}

module.exports = validate;
