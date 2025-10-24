const User = require("../models/User");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


exports.registerr = async (req, res) => {
    console.log('shazib', req.body);
    const { username, email, password } = req.body

    try {

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            console.log('existingUser:::', existingUser);
            return res.status(409).json({ msg: 'E-mail is already taken.' })
        }

        const newUser = new User({ ...req.body, role: 'user' });
        await newUser.save();
        console.log(newUser);
        res.status(200).json({ msg: 'Sign up successfull.' })
    } catch (error) {
        console.error(error);
        res.status(409).json({ msg: 'sign up failed.' })
    }



}

exports.login = async (req, res) => {
    console.log('shazib', req.body);
    const { email, password } = req.body

    try {

        const userFound = await User.findOne({ email })
        console.log('userFound:', userFound);
        if (!userFound) return res.status(404).json({ msg: 'User not Found!' })

        if (userFound.status === 'blocked') return res.status(403).json({ msg: 'Your account is blocked. For further details contact support.' })

        const isMatched = await bcrypt.compare(password, userFound.password)
        console.log('isMatched:', isMatched);
        if (!isMatched) return res.status(401).json({ msg: 'Incorrect password!' })

        const payload = {
            id: userFound._id,
            username: userFound.username,
            email: userFound.email,
            role: userFound.role,
            avatar: userFound.avatar  
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET)
        console.log('token:', token);

        res.status(200).json({ msg: 'Log in successfull.', token: token, user: payload })
    } catch (error) {
        console.error(error);
        res.status(409).json({ msg: 'Log in failed.' })
    }
}