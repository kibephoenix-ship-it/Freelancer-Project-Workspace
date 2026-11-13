import { Router } from "express";
import healthRouter from "./health";
import workspaceRouter from "./workspace";
const router = Router();
router.use(healthRouter);
router.use(workspaceRouter);
export default router;
