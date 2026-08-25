import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  createPositionController,
  listPositionsController,
  updatePositionController,
} from "./positions.controller";

const router = Router();

router.get(
  "/",
  requirePermission("employee.read"),
  asyncHandler(listPositionsController),
);
router.post(
  "/",
  requirePermission("employee.create"),
  asyncHandler(createPositionController),
);
router.patch(
  "/:id",
  requirePermission("employee.update"),
  asyncHandler(updatePositionController),
);

export default router;
