const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const AppError = require(`${__dirname}/../utils/appErrors`);
const File = require(`${__dirname}/../Models/fileModel`);
const { getCityFromIP, validateCityAccess } = require(`${__dirname}/../utils/geolocation`);
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

//Blockhain setup
const { ethers } = require("ethers");
const contractABI = require(`${__dirname}/../blockchain/contractABI.json`);

const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

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

// Generate File hash Function
const generateFileHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Controllers
exports.fsUpload =[ 
    upload.single('file'),
    catchAsync( async (req, res, next)=>{
        if(!req.file){
            return next(new AppError('Please upload a file first', 404));
        }

        // Get cities from request body
        const { cities } = req.body;
        const allowedCities = cities ? cities.split(',').map(city => city.trim()) : [];

        // generate file hash
        const fileHash = generateFileHash(req.file.path);
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
            allowedCities: allowedCities, // NEW FIELD
            accessLocation: { // NEW FIELD
                type: allowedCities.length > 0 ? 'specific-cities' : 'anywhere',
                cities: allowedCities
            }
        });

        const shareableLink = `${req.protocol}://${req.get('host')}/api/files/share/${token}`;

        //send response
        res.status(201).json({
            status: 'success',
            //fileData: req.file,
            fileData: {
                originalname: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            },
            shareableLink: shareableLink,
            downloadLink: downloadLink,
            allowedCities: allowedCities
        })
    })
];

exports.fsShare = catchAsync(async (req, res, next) => {
    const { token } = req.params;

    // Verify token exists
    const fileData = await File.findOne({ shareToken: token }).populate('uploadedBy', 'name email');;

    if(!fileData){
        return next(new AppError(`Invalid Token: ${token}`, 404));
    }

    // Verify file exits
    //const filePath = path.join('file-uploads', fileData.filename);

    if (!fs.existsSync(fileData.path)) {
        await File.findByIdAndDelete(fileData._id);
        return next(new AppError('File not found', 404));
    }

    //Check expiry
    if (fileData.expiresAt < new Date()) {
        // Cleanup
        try {
            fs.unlinkSync(fileData.path);
        } catch (err) {
            console.error('Error deleting expired file:', err);
        }
        await File.findByIdAndDelete(fileData._id);
        return next(new AppError('Expired download link', 404));
    }

    //verify file from Blockchain
    const fileHash = generateFileHash(fileData.path);
    const hexHash = "0x" + fileHash;

    let verified = false;
    try {
        verified = await contract.verifyFileHash(hexHash);
    } catch (error) {
        console.error('Blockchain verification error:', error);
    }

    // Increment download count
    //fileData.downloadCount += 1;
    //await fileData.save();

    const downloadLink = `${req.protocol}://${req.get('host')}/api/files/download/${fileData.filename}`;

    // Send response
    res.json({
        status: 'success',
        data: {
            originalName: fileData.originalName,
            size: fileData.size,
            uploadedBy: fileData.uploadedBy.name,
            downloadLink: downloadLink,
            expiresAt: fileData.expiresAt,
            downloadCount: fileData.downloadCount,
            message: verified ? 
                "✅ File verified on blockchain" : 
                "⚠ File not verified on blockchain (This means the file may have been edited after upload)"
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

    res.setHeader('Content-Type', mimeTypes[fileExt] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.originalName}"`);
    res.download(filePath, fileData.originalName);
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