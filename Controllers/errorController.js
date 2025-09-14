module.exports = (err, req, res, next) =>{
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.ENVIRONMENT == 'development'){
        console.log(err)
        res.status(err.statusCode).json({
            status: err.status,
            message: err.shortMessage || err.message,
            stack: err.stack
        })
    }
    else{
        // Corrected variable name from 'error' to 'err'
        if (err.name === 'CastError') {
            const message = 'Invalid resource id';
            err = new AppError(message, 400);
        }
    
        if (err.code === 11000) {
            const message = 'Duplicate field value entered';
            err = new AppError(message, 400);
        }
    
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(el => el.message);
            const message = `Invalid input data. ${errors.join('. ')}`;
            err = new AppError(message, 400);
        }
    
        // Send error
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }
}