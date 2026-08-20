import { Router } from "express";
import brandRoutes from "../modules/brands/brands.routes";
import categoryRoutes from "../modules/categories/categories.routes";
import productRoutes from "../modules/products/products.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);

export default router;
