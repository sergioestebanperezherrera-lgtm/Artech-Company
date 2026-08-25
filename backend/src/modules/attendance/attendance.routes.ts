import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  clockInController,
  clockOutController,
  listAttendanceController,
  overrideAttendanceController,
} from "./attendance.controller";

const router = Router();

router.get(
  "/",
  requirePermission("attendance.read"),
  asyncHandler(listAttendanceController),
);
router.post(
  "/clock-in",
  requirePermission("attendance.record"),
  asyncHandler(clockInController),
);
router.post(
  "/clock-out",
  requirePermission("attendance.record"),
  asyncHandler(clockOutController),
);
router.patch(
  "/:id",
  requirePermission("attendance.override"),
  asyncHandler(overrideAttendanceController),
);

export default router;
