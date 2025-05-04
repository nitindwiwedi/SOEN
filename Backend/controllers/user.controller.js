import userModel from "../models/user.model.js";
import * as userServices from "../services/user.service.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.service.js";

export const createUserController = async function(req, res){
    const error = validationResult(req);
    if(!error.isEmpty()){
        return res.status(400).json({error: error.array()});
    }

    try {
        const user = await userServices.createUser(req.body);
        const token = user.generateToken();
        delete user._doc.password;
        res.status(201).json({user, token});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

export const loginUserController = async function(req, res){
    const error = validationResult(req);
    if(!error.isEmpty()){
      return res.status(400).send({error: error.array()});
    }

    const {email, password} = req.body;
    const user = await userModel.findOne({email}).select("+password");
    if(!user){
        return res.status(400).send({
            error: "Invalid Credentials"
        });
    }

    const isMatch = await user.comparePassword(password);
    if(!isMatch){
        return res.status(400).send({
            error: "Invalid Credentials"
        });
    }

    const token = user.generateToken();
    delete user._doc.password;
    res.status(200).send({user, token});
}


export const getUserProfile = async function(req, res){
    res.status(200).json({
        user: req.user
    });
}

export const logoutController = async function(req, res){
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        redisClient.set(token, 'logout', 'EX', 60*60*24);
        res.status(200).json({
            message: "Logged out Successfully"
        })
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
}

export const getAllUsers = async function(req, res){
    try {
        const loggedInUser = await userModel.findOne({email: req.user.email});
        const getAllusers = await userServices.getAllusersService({userId: loggedInUser._id});
        return res.status(201).json({getAllusers});
    } catch (error) {
        console.log(error.message);
        res.status(400).send(error.message);
    }
}