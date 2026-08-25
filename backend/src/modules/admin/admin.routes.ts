import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import {
  requireAdminAccess,
  requireAuth,
} from "../auth/auth.middleware";
import employeeRoutes from "../employees/employees.routes";
import positionRoutes from "../employees/positions.routes";
import { adminMeController } from "./admin.controller";
import shiftRoutes from "../shifts/shifts.routes";
import attendanceRoutes from "../attendance/attendance.routes";
import cashRoutes from "../cash/cash.routes";
import posRoutes from "../pos/pos.routes";
import inventoryRoutes from "../inventory/inventory.routes";
import payrollRoutes from "../payroll/payroll.routes";

const router = Router();

router.get(
  "/me",
  requireAuth,
  requireAdminAccess,
  asyncHandler(adminMeController),
);
router.use("/positions", positionRoutes);
router.use("/shifts", shiftRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/cash", cashRoutes);
router.use("/pos", posRoutes);
router.use("/employees", employeeRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/payroll", payrollRoutes);

export default router;
