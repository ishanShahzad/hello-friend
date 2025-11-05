const jwt = require('jsonwebtoken')

const verifyToken = async (req, res, next) => {
    const authHeader = req.header('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) return res.status(401).json({ msg: 'No token provided!' })

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(403).json({ msg: 'Login required' }) 
    }  
}

module.exports = verifyToken  