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

const router = Router();

router.get(
  "/me",
  requireAuth,
  requireAdminAccess,
  asyncHandler(adminMeController),
);
router.use("/positions", positionRoutes);
router.use("/shifts", shiftRoutes);
router.use("/employees", employeeRoutes);

export default router;
