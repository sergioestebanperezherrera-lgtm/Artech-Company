import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import {
  requireAdminAccess,
  requireAuth,
} from "../auth/auth.middleware";
import { adminMeController } from "./admin.controller";

const router = Router();

router.get(
  "/me",
  requireAuth,
  requireAdminAccess,
  asyncHandler(adminMeController),
);

export default router;
