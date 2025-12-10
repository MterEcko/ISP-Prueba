// backend/src/routes/payrollPayment.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/payrollPayment.controller");

module.exports = function(app) {
  app.get("/api/payroll-payments", [authJwt.verifyToken], controller.getAll);
  app.get("/api/payroll-payments/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/payroll-payments", [authJwt.verifyToken], controller.create);
  app.put("/api/payroll-payments/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/payroll-payments/:id", [authJwt.verifyToken], controller.delete);
};
