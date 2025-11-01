const jwt = require('jsonwebtoken')

const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]
    if (!token) return res.status(401).json({ msg: 'No token provided!' })

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log('=== TOKEN DECODED ===');
        console.log('Decoded user:', decoded);
        req.user = decoded
        next()
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(403).json({ msg: 'Login required' }) 
    }  
}

module.exports = verifyToken  