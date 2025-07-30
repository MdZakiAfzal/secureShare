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
        console.log(err)
        res.status(err.statusCode).json({
            status: err.status,
            message: err.shortMessage || err.message,
        })
    }
    
    
}