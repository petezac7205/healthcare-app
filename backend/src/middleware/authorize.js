import { forbidden } from '../utils/errors.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};
