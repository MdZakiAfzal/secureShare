const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const AppError = require(`${__dirname}/../utils/appErrors`);
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
        fileSize: 5 * 1024 * 1024 * 1024 // 5GB limit
    }
})

const fileStore = new Map();

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

        // generate file hash
        const fileHash = generateFileHash(req.file.path);
        const hexHash = "0x" + fileHash;

        // send filehash to the network
        const tx = await contract.uploadFileHash(hexHash);
        await tx.wait(); // wait for transaction to be mined
        console.log("✅ File hash stored on-chain.");
        
        //Set file Metadata and share Link
        const token = crypto.randomBytes(16).toString('hex');

        const downloadLink = `${req.protocol}://${req.get('host')}/api/files/download/${req.file.filename}`;
    
        fileStore.set(token, {
            filename: req.file.filename,
            downloadLink: downloadLink,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
        const shareableLink = `${req.protocol}://${req.get('host')}/api/files/share/${token}`;

        //send response
        res.status(201).json({
            status: 'success',
            fileData: req.file,
            shareableLink: shareableLink
        })
    })
];

exports.fsShare = catchAsync(async (req, res, next) => {
    const { token } = req.params;

    // Verify token exists
    const fileData = fileStore.get(token);

    if(!fileData){
        return next(new AppError(`Invalid Token: ${token}`, 404));
    }

    // Verify file exits
    const filePath = path.join('file-uploads', fileData.filename);

    if (!fs.existsSync(filePath)) {
        return next(new AppError('File not found', 404));
    }

    //Check expiry
    if (fileData.expiresAt < Date.now()) {
        // Cleanup
        fileStore.delete(token); 
        fs.unlinkSync(filePath);
        return next(new AppError('Expired download link', 404));
    }

    //verify file from Blockchain
    const fileHash = generateFileHash(filePath);
    const hexHash = "0x" + fileHash;

    let verified = false;
    verified = await contract.verifyFileHash(hexHash);

    //send response
    res.json({
        status: 'success',
        data: {
            downloadLink: fileData.downloadLink,
            expiresAt: new Date(fileData.expiresAt).toISOString(),
            message: verified ? "✅ File verified on blockchain" : "⚠ File not verified on blockchain (This means the file may have been edited after upload)"
        }
    });
});

exports.fsDownload = catchAsync(async (req, res, next) => {
    const { filename } = req.params;
    const filePath = path.join('file-uploads', filename);

    if (!fs.existsSync(filePath)) {
        return next(new AppError('File not found', 404));
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
        '.png': 'image/png'
    };

    res.setHeader('Content-Type', mimeTypes[fileExt] || 'application/octet-stream');
    res.download(filePath, filename);
});