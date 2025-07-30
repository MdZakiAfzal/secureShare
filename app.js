const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fsTransferRouter = require(`${__dirname}/Routers/fsTransferRouter`);
const authRouter = require(`${__dirname}/Routers/authRouter`);
const globalErrorHandlingMiddleware = require(`${__dirname}/Controllers/errorController`);
const AppError = require(`${__dirname}/utils/appErrors`);
const path = require('path');

const app = express();

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
}) 

//Middlewares
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(express.json());
app.use(limiter);
 
//Routes
app.use("/api/files", fsTransferRouter);
app.use("/api/auth", authRouter);


app.all(/.*/, (req, res, next) => {
    next(new AppError(`Can't find the url: ${req.originalUrl} on this server.`, 404));
});

//Error Handling
app.use(globalErrorHandlingMiddleware)

module.exports = app;
