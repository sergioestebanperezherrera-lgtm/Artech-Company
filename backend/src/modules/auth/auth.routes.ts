import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import {
  googleCallbackController,
  googleLoginController,
  loginController,
  logoutController,
  meController,
  registerController,
} from "./auth.controller";
import { authRateLimiter } from "./auth.rate-limit";
import { requireAuth } from "./auth.middleware";

const router = Router();

router.post("/register", authRateLimiter, asyncHandler(registerController));
router.post("/login", authRateLimiter, asyncHandler(loginController));
router.get("/google", asyncHandler(googleLoginController));
router.get("/google/callback", asyncHandler(googleCallbackController));
router.get("/me", requireAuth, asyncHandler(meController));
router.post("/logout", asyncHandler(logoutController));

export default router;
