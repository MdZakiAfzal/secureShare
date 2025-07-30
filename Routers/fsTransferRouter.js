const express = require('express')
const fsTransferController = require(`${__dirname}/../Controllers/fsTransferController`);
const authController = require(`${__dirname}/../Controllers/authController`);


const Router = express.Router()

Router.route("/upload").post(authController.protect, fsTransferController.fsUpload)
Router.route("/share/:token").get(fsTransferController.fsShare)
Router.route("/download/:filename").get(fsTransferController.fsDownload)

module.exports = Router;