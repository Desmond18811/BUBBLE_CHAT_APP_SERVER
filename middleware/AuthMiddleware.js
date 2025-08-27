export const verifyToken = (req, res, next) => {
  console.log('Cookies received:', req.cookies);
  console.log('JWT cookie:', req.cookies.jwt);

  const token = req.cookies.jwt;

  if (!token) {
    console.log('No token found in cookies');
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'User not authenticated'
    });
  }

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Invalid token'
      });
    }

    req.userId = payload.userId;
    console.log('Token verified successfully for user:', payload.userId);
    next();
  });
};