import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { listCategoriesController } from "./categories.controller";

const router = Router();

router.get("/", asyncHandler(listCategoriesController));

export default router;
