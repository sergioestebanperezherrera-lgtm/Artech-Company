import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  createShiftController,
  listShiftsController,
  updateShiftController,
} from "./shifts.controller";

const router = Router();

router.get("/", requirePermission("shift.read"), asyncHandler(listShiftsController));
router.post(
  "/",
  requirePermission("shift.manage"),
  asyncHandler(createShiftController),
);
router.patch(
  "/:id",
  requirePermission("shift.manage"),
  asyncHandler(updateShiftController),
);

export default router;
