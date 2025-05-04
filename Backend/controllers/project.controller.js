import projectModel from '../models/project.model.js';
import * as projectService  from '../services/project.service.js';
import { validationResult } from 'express-validator';
import userModel from '../models/user.model.js';
import mongoose from 'mongoose';

export const createProjectController = async(req, res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    try {
        const {name} = req.body;
        const LoggedInUser = await userModel.findOne({email: req.user.email});
        const userId = LoggedInUser._id;
    
        const newProject = await projectService.createProject({name, userId});
        res.status(201).json(newProject)
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }

}

export const getAllProjects = async(req, res)=>{
    try {
        const loggedInUser = await userModel.findOne({email: req.user.email});
        const allUserProjects = await projectService.getAllProjectsService({userId: loggedInUser._id});
        return res.status(200).json({
            projects: allUserProjects
        })
    } catch (error) {
        console.log(error);
        res.status(400).send(err.message);
    }
}

export const addUserController = async(req, res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        res.status(400).json({errors: errors.array()});
    }
    try {
        const {projectId, users} = req.body;
        const loggedInUser = await userModel.findOne({email: req.user.email});
        const project = await projectService.addUserstoProject({projectId, users, userId: loggedInUser._id});
        return res.status(200).json({
            project
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({error: error.message});
    }
}

export const getProjectController = async(req, res)=>{
    const {projectId} = req.params;
    try {
        const project = await projectService.getProjectService({projectId});
        res.status(200).json({project});
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
}

export const updateFileTreeController = async(req, res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    try {
        const {projectId, fileTree} = req.body;
        const loggedInUser = await userModel.findOne({email: req.user.email});
        const project = await projectService.updateFileTreeService({projectId, fileTree, userId: loggedInUser._id});
        return res.status(200).json({project});
    } catch (error) {
        console.log(error);
        res.status(400).json({error: error.message});
    }
}