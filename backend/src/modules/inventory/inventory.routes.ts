import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  createManualMovementController,
  listInventoryController,
  listMovementsController,
} from "./inventory.controller";

const router = Router();

router.get(
  "/",
  requirePermission("inventory.read"),
  asyncHandler(listInventoryController),
);
router.get(
  "/movements",
  requirePermission("inventory.read"),
  asyncHandler(listMovementsController),
);
router.post(
  "/movements",
  requirePermission("inventory.adjust"),
  asyncHandler(createManualMovementController),
);

export default router;
