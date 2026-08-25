import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
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
