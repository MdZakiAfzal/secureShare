const express = require('express')
const fsTransferController = require(`${__dirname}/../Controllers/fsTransferController`);
const authController = require(`${__dirname}/../Controllers/authController`);


const Router = express.Router()

Router.route("/upload").post(authController.protect, fsTransferController.fsUpload)
Router.route("/share/:token").post(fsTransferController.fsShare)
Router.route("/download/:filename").get(fsTransferController.fsDownload)
Router.route("/cleanup").delete(authController.protect, fsTransferController.cleanupExpiredFiles) // Admin only
Router.route('/my-files').get(authController.protect,fsTransferController.fsGetMyFiles); 

module.exports = Router;