const express = require('express')
const authController = require(`${__dirname}/../Controllers/authController`);


const Router = express.Router()

Router.route("/login").post(authController.login)
Router.route("/signup").post(authController.signup)

module.exports = Router;