/* eslint-disable prettier/prettier */
const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const AppError = require(`${__dirname}/../utils/appErrors`);
const File = require(`${__dirname}/../Models/fileModel`);
const { getCityFromIP, validateCityAccess } = require(`${__dirname}/../utils/geolocation`);
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const bcrypt = require('bcryptjs');
const { sendEmail } = require(`${__dirname}/../utils/email`);

//Blockhain setup
const { ethers } = require("ethers");
const contractABI = require(`${__dirname}/../blockchain/contractABI.json`);

const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

// Promisify pipeline for async/await usage
const pipeline = util.promisify(stream.pipeline);

//Logic for File upload to the Database
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'file-uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); // Gets ".jpg", ".pdf", etc.
        const basename = path.basename(file.originalname, ext); // Gets "report" from "report.pdf"
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
})

const fileFilter = (req, file, cb)=>{
    const allowedFeilds = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'text/plain',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];

    if(allowedFeilds.includes(file.mimetype)){
        cb(null, true);
    } else{
        cb(new AppError('Invalid file type. Only JPEG, PNG, PDF, PPT, PPTX, WORD and text files are allowed.',400),false)
    }
};

const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: {
        fileSize: 300 * 1024 * 1024// 300 MB limit
    }
})

// Generate File hash Function with streaming for large files
const generateFileHash = async (filePath) => {
  const hash = crypto.createHash('sha256');
  const fileStream = fs.createReadStream(filePath);
  
  return new Promise((resolve, reject) => {
    fileStream.on('data', (chunk) => {
      hash.update(chunk);
    });
    
    fileStream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    fileStream.on('error', (error) => {
      reject(new AppError('Error reading file for hash generation', 500));
    });
  });
};

// Controllers
exports.fsUpload =[ 
    upload.single('file'),
    catchAsync( async (req, res, next)=>{
        if(!req.file){
            return next(new AppError('Please upload a file first', 404));
        }

        const { cities, password } = req.body;
        const allowedCities = cities ? cities.split(',').map(city => city.trim()) : [];
        let hashedPassword = null; // Initialize hashedPassword to null

        // Hash the password if provided and not an empty string
        if (password && password.length > 0) {
            hashedPassword = await bcrypt.hash(password, 12);
        }

        // generate file hash using streaming for better memory efficiency
        const fileHash = await generateFileHash(req.file.path);
        const hexHash = "0x" + fileHash;

        // send filehash to the network
        const tx = await contract.uploadFileHash(hexHash);
        const receipt = await tx.wait(); // wait for transaction to be mined
        console.log("✅ File hash stored on-chain. Tx Hash: ", receipt.hash);
        
        //Set file Metadata and share Link
        const token = crypto.randomBytes(16).toString('hex');

        const downloadLink = `${req.protocol}://${req.get('host')}/api/files/download/${req.file.filename}`;
    
        // Create file metadata in database
        const newFile = await File.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            fileHash: fileHash,
            blockchainTxHash: receipt.hash,
            uploadedBy: req.user._id,
            shareToken: token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            allowedCities: allowedCities,
            accessLocation: {
                type: allowedCities.length > 0 ? 'specific-cities' : 'anywhere',
                cities: allowedCities
            },
            password: hashedPassword // Save the hashed password
        });

        const shareableLink = `${req.protocol}://${req.get('host')}/api/files/share/${token}`;

        //send response
        res.status(201).json({
            status: 'success',
            fileData: {
                originalName: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            },
            shareableLink: shareableLink,
            downloadLink: downloadLink,
            allowedCities: allowedCities,
            password: password ? true : false // Return a boolean indicating password protection
        })
    })
];

exports.fsShare = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const password = req.body?.password || ''; // safe destructure

  // Find file and populate uploader info
  const fileData = await File.findOne({ shareToken: token })
    .select('+password')
    .populate('uploadedBy', 'email name'); // adjust based on your User schema

  if (!fileData) {
    return next(new AppError(`Invalid Token: ${token}`, 404));
  }

  // Password check
  if (fileData.password) {
    if (!password) {
      return next(new AppError('This file is password protected. Please provide a password.', 401));
    }
    const isPasswordCorrect = await bcrypt.compare(password, fileData.password);
    if (!isPasswordCorrect) {
      return next(new AppError('Incorrect password', 401));
    }
  }

  // File existence check
  if (!fs.existsSync(fileData.path)) {
    await File.findByIdAndDelete(fileData._id);
    return next(new AppError('File not found', 404));
  }

  // Expiry check
  if (fileData.expiresAt < new Date()) {
    try { fs.unlinkSync(fileData.path); } catch (err) { console.error('Error deleting expired file:', err); }
    await File.findByIdAndDelete(fileData._id);
    return next(new AppError('Expired download link', 404));
  }

  // Blockchain verification
  const fileHash = await generateFileHash(fileData.path);
  const hexHash = "0x" + fileHash;

  let verified = false;
  try {
    verified = await contract.verifyFileHash(hexHash);
  } catch (error) {
    console.error('Blockchain verification error:', error);
  }

  // If not verified → send email alert to uploader
  if (!verified && fileData.uploadedBy && fileData.uploadedBy.email) {
    const uploaderEmail = fileData.uploadedBy.email;
    const uploaderName = fileData.uploadedBy.name || 'user';

    const subject = `⚠️ File Tampering Alert: ${fileData.originalName}`;
    const message = `Hi ${uploaderName},\n\n` +
      `The file "${fileData.originalName}" (share token: ${token}) failed blockchain verification and may have been tampered with.\n\n` +
      `If possible, please investigate and consider re-uploading the original.\n\n` +
      `-- SecureShare`;

    try {
      await sendEmail({
        to: uploaderEmail,
        subject,
        text: message
      });
      console.log(`📧 Tamper alert sent to ${uploaderEmail}`);
    } catch (mailErr) {
      console.error('❌ Failed to send tamper alert email:', mailErr);
    }
  }

  // Build response
  const downloadLink = `${req.protocol}://${req.get('host')}/api/files/download/${fileData.filename}`;

  res.json({
    status: 'success',
    data: {
      originalName: fileData.originalName,
      size: fileData.size,
      downloadLink: downloadLink,
      expiresAt: fileData.expiresAt,
      downloadCount: fileData.downloadCount,
      message: verified ?
        "✅ File verified on blockchain" :
        "⚠ File not verified on blockchain (Possible tampering detected)"
    }
  });
});

exports.fsDownload = catchAsync(async (req, res, next) => {
    const { filename } = req.params;
    //const filePath = path.join('file-uploads', filename);

    // Find file in database
    const fileData = await File.findOne({ filename });

    if (!fileData) {
        return next(new AppError('File not found', 404));
    }

    const filePath = path.join('file-uploads', filename);

    if (!fs.existsSync(filePath)) {
        // Remove from database if file doesn't exist
        await File.findByIdAndDelete(fileData._id);
        return next(new AppError('File not found', 404));
    }

    // Check expiry
    if (fileData.expiresAt < new Date()) {
        // Cleanup - delete file and database record
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error('Error deleting expired file:', err);
        }
        await File.findByIdAndDelete(fileData._id);
        return next(new AppError('Expired download link', 404));
    }

    // Check city access if restricted
    if (fileData.accessLocation.type === 'specific-cities' && 
        fileData.allowedCities.length > 0) {
        
        // Get user's city from IP
        const userIP = req.ip || req.connection.remoteAddress;
        const userCity = await getCityFromIP(userIP);
        
        const hasAccess = validateCityAccess(userCity, fileData.allowedCities);
        
        if (!hasAccess) {
            return next(new AppError(
                `Access denied. This file is only available in: ${fileData.allowedCities.join(', ')}. Your detected location: ${userCity || 'Unknown'}`,
                403
            ));
        }
    }

    // Set appropriate Content-Type based on file extension
    const fileExt = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.txt': 'text/plain'
    };

    // Increment download count
    fileData.downloadCount += 1;
    await fileData.save();

    // Use streaming for efficient file download
    const fileStream = fs.createReadStream(filePath);
    
    res.setHeader('Content-Type', mimeTypes[fileExt] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.originalName}"`);
    res.setHeader('Content-Length', fileData.size);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
            return next(new AppError('Error streaming file', 500));
        }
    });
    
    // Pipe the file stream to the response
    fileStream.pipe(res);
});

// Optional: Add a cleanup function for expired files
exports.cleanupExpiredFiles = catchAsync(async (req, res, next) => {
    const expiredFiles = await File.find({ 
        expiresAt: { $lt: new Date() } 
    });
    
    let deletedCount = 0;
    
    for (const file of expiredFiles) {
        try {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            await File.findByIdAndDelete(file._id);
            deletedCount++;
        } catch (err) {
            console.error(`Error deleting file ${file.filename}:`, err);
        }
    }
    
    res.status(200).json({
        status: 'success',
        message: `Cleaned up ${deletedCount} expired files`
    });
});