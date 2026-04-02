const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()

let cached = global._mongooseConnection;

const ConnectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set. Database connection skipped.');
    return;
  }

  // Reuse cached connection in serverless environments
  if (cached && cached.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    cached = mongoose.connection;
    global._mongooseConnection = cached;
    console.log('MongoDB Connected.');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
}

module.exports = ConnectDB
