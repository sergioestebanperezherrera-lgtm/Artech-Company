import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  createCompensationPeriodController,
  getEmployeeCompensationController,
} from "./compensation.controller";
import {
  createShiftAssignmentController,
  getEmployeeShiftsController,
} from "../shifts/shifts.controller";
import {
  changeEmployeePositionController,
  createEmployeeController,
  getEmployeeController,
  listEmployeesController,
  reactivateEmployeeController,
  terminateEmployeeController,
  updateEmployeeController,
} from "./employees.controller";

const router = Router();

router.get(
  "/",
  requirePermission("employee.read"),
  asyncHandler(listEmployeesController),
);
router.post(
  "/",
  requirePermission("employee.create"),
  asyncHandler(createEmployeeController),
);
router.get(
  "/:employeeId/compensation",
  requirePermission("salary.read"),
  asyncHandler(getEmployeeCompensationController),
);
router.post(
  "/:employeeId/compensation",
  requirePermission("salary.update"),
  asyncHandler(createCompensationPeriodController),
);
router.get(
  "/:employeeId/shifts",
  requirePermission("shift.read"),
  asyncHandler(getEmployeeShiftsController),
);
router.post(
  "/:employeeId/shifts",
  requirePermission("shift.manage"),
  asyncHandler(createShiftAssignmentController),
);
router.get(
  "/:id",
  requirePermission("employee.read"),
  asyncHandler(getEmployeeController),
);
router.patch(
  "/:id",
  requirePermission("employee.update"),
  asyncHandler(updateEmployeeController),
);
router.post(
  "/:id/change-position",
  requirePermission("employee.update"),
  asyncHandler(changeEmployeePositionController),
);
router.post(
  "/:id/terminate",
  requirePermission("employee.deactivate"),
  asyncHandler(terminateEmployeeController),
);
router.post(
  "/:id/reactivate",
  requirePermission("employee.update"),
  asyncHandler(reactivateEmployeeController),
);

export default router;
