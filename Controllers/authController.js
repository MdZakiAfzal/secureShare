const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const User = require(`${__dirname}/../Models/userModel`);
const jwt = require('jsonwebtoken');
const AppError = require(`${__dirname}/../utils/appErrors`)
const { promisify } = require('util');  

const createSendToken = (res, user, statuscode) => {
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })

    //user.password = undefined;
    res.status(statuscode).json({
        status:'success',
        token,
        data: { user }
    })
}

exports.signup = catchAsync( async (req, res, next)=>{
    const user = await User.create(req.body);

    createSendToken(res, user, 201)
})

exports.login = catchAsync( async (req, res, next)=>{
    const {email, password} = req.body;

    if(!email ||!password){
        return next(new AppError('Please provide email and password', 400))
    }

    const user = await User.findOne({email}).select('+password');

    if (!user) {
        return next(new AppError('Invalid email or password', 401));
    }

    // Properly await the password comparison
    const isPasswordCorrect = await user.comparePassword(password, user.password);
    
    if (!isPasswordCorrect) {
        return next(new AppError('Invalid email or password', 401));
    }

    createSendToken(res, user, 200)
})

exports.protect = catchAsync( async (req, res, next)=>{
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }
    if(!token){
        return next(new AppError('please signin to access this route', 401))
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
    if(!user){
        return next(new AppError('User does not exist', 404));
    }

    if(user.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User has changed password. Please login again', 401));
    }

    req.user = user;
    next();
})