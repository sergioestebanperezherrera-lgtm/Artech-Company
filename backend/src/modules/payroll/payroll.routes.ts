import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  adjustPayrollSlipController,
  calculatePayrollPeriodController,
  closePayrollPeriodController,
  createPayrollPeriodController,
  getPayrollPeriodController,
  listPayrollPeriodsController,
} from "./payroll.controller";

const router = Router();

router.get(
  "/periods",
  requirePermission("payroll.read"),
  asyncHandler(listPayrollPeriodsController),
);
router.post(
  "/periods",
  requirePermission("payroll.manage"),
  asyncHandler(createPayrollPeriodController),
);
router.get(
  "/periods/:id",
  requirePermission("payroll.read"),
  asyncHandler(getPayrollPeriodController),
);
router.post(
  "/periods/:id/calculate",
  requirePermission("payroll.manage"),
  asyncHandler(calculatePayrollPeriodController),
);
router.post(
  "/periods/:id/close",
  requirePermission("payroll.close"),
  asyncHandler(closePayrollPeriodController),
);
router.patch(
  "/slips/:id",
  requirePermission("payroll.manage"),
  asyncHandler(adjustPayrollSlipController),
);

export default router;
