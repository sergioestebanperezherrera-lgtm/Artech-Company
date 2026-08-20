import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { listBrandsController } from "./brands.controller";

const router = Router();

router.get("/", asyncHandler(listBrandsController));

export default router;
