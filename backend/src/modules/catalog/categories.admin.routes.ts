import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { requirePermission } from "../auth/auth.middleware";
import {
  adminCreateCategoryController,
  adminListCategoriesController,
  adminUpdateCategoryController,
} from "./categories.admin.controller";

const router = Router();

router.get(
  "/",
  requirePermission("catalog.manage"),
  asyncHandler(adminListCategoriesController),
);
router.post(
  "/",
  requirePermission("catalog.manage"),
  asyncHandler(adminCreateCategoryController),
);
router.patch(
  "/:id",
  requirePermission("catalog.manage"),
  asyncHandler(adminUpdateCategoryController),
);

export default router;
