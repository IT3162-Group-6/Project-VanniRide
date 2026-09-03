const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    // Development mode error details
    if (process.env.NODE_ENV === 'development') {
      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        stack: err.stack,
        error: err,
      });
    }
  
    // Production mode user-friendly error
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
  
    // Unknown Errors
    console.error('ERROR 💥:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error!',
    });
  };
  
  module.exports = errorHandler;