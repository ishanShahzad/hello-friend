
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()

const ConnectDB = async ()=>{
    await mongoose.connect(process.env.MONGO_URI).then(()=>{
        console.log('MongoDB Connected.');
    })
}

module.exports = ConnectDB