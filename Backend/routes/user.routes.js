import express from "express";
const router = express.Router();
import * as userController from "../controllers/user.controller.js";
import { body } from "express-validator";
import * as authMiddleware from "../middleware/auth.middleware.js";
import user from "../models/user.model.js";

router.post("/register",
     body('email').isEmail().withMessage("Email must be a valid email"),
     body('password').isLength({min: 3}).withMessage("Password must be at least 3 characters long")
    , userController.createUserController
);

router.post("/login",
    body('email').isEmail().withMessage("Email must be a valid email"),
    body('password').isLength({min: 3}).withMessage("Password must be at least 3 characters long")
    ,userController.loginUserController);

router.get("/profile", authMiddleware.authUser, userController.getUserProfile);

router.get("/all", authMiddleware.authUser, userController.getAllUsers);

router.get("/logout", authMiddleware.authUser, userController.logoutController);

export default router;  