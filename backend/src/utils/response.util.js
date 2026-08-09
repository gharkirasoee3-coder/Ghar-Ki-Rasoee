class ResponseUtil {
  static send(res, statusCode, message, data = null) {
    return res.status(statusCode).json({
      success: statusCode >= 200 && statusCode < 300,
      message,
      data,
    });
  }

  static error(res, statusCode, message, error = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      error: error ? error.message || error : null,
    });
  }
}

module.exports = ResponseUtil;
