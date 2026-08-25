import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  adminCreateProductController,
  adminGetProductController,
  adminListBrandsController,
  adminListProductsController,
  adminUpdateProductController,
} from "./catalog.controller";

const router = Router();

router.get(
  "/",
  requirePermission("catalog.manage"),
  asyncHandler(adminListProductsController),
);
router.get(
  "/brands",
  requirePermission("catalog.manage"),
  asyncHandler(adminListBrandsController),
);
router.post(
  "/",
  requirePermission("catalog.manage"),
  asyncHandler(adminCreateProductController),
);
router.get(
  "/:id",
  requirePermission("catalog.manage"),
  asyncHandler(adminGetProductController),
);
router.patch(
  "/:id",
  requirePermission("catalog.manage"),
  asyncHandler(adminUpdateProductController),
);

export default router;
