import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  closeCashSessionController,
  createCashMovementController,
  createCashRegisterController,
  currentCashSessionController,
  getCashSessionController,
  listCashRegistersController,
  openCashSessionController,
} from "./cash.controller";

const router = Router();

router.get(
  "/registers",
  requirePermission("cash.read"),
  asyncHandler(listCashRegistersController),
);
router.post(
  "/registers",
  requirePermission("cash.open"),
  asyncHandler(createCashRegisterController),
);
router.get(
  "/sessions/current",
  requirePermission("cash.read"),
  asyncHandler(currentCashSessionController),
);
router.post(
  "/sessions/open",
  requirePermission("cash.open"),
  asyncHandler(openCashSessionController),
);
router.get(
  "/sessions/:id",
  requirePermission("cash.read"),
  asyncHandler(getCashSessionController),
);
router.post(
  "/sessions/:id/movements",
  requirePermission("cash.move"),
  asyncHandler(createCashMovementController),
);
router.post(
  "/sessions/:id/close",
  requirePermission("cash.close"),
  asyncHandler(closeCashSessionController),
);

export default router;
