// backend/src/middleware/auth.middleware.js
// Re-export auth functionality from auth.jwt.js

const authJwt = require('./auth.jwt');

module.exports = authJwt;
