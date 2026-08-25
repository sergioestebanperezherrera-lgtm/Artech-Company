import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  createPosSaleController,
  getPosSaleController,
  listPosSalesController,
} from "./pos.controller";

const router = Router();

router.get(
  "/sales",
  requirePermission("sale.read"),
  asyncHandler(listPosSalesController),
);
router.get(
  "/sales/:id",
  requirePermission("sale.read"),
  asyncHandler(getPosSaleController),
);
router.post(
  "/sales",
  requirePermission("sale.pos_create"),
  asyncHandler(createPosSaleController),
);

export default router;
