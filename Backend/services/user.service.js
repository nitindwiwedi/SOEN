import userModel from "../models/user.model.js";

export const createUser = async function({email, password}){
    if(!email || !password){
        throw new Error("Email and password are required");
    }

    const hashedPassword = await userModel.hashedPassword(password);
    const user = await userModel.create({
        email,
        password: hashedPassword
    });

    return user;
}

export const getAllusersService = async function({userId}){
    if(!userId){
        throw new Error("UserId is required!");
    }

    const users = await userModel.find({
        _id: { $ne: userId } 
    },);

    return users;
}