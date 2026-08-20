import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import {
  getProductController,
  listProductsController,
} from "./products.controller";

const router = Router();

router.get("/", asyncHandler(listProductsController));
router.get("/:slug", asyncHandler(getProductController));

export default router;
