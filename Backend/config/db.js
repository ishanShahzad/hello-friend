const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()

let connectionPromise = null;

const ConnectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set. Database connection skipped.');
    return;
  }

  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If a connection attempt is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start a new connection attempt
  connectionPromise = mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  }).then(() => {
    console.log('MongoDB Connected.');
    connectionPromise = null;
  }).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    connectionPromise = null;
    throw err;
  });

  return connectionPromise;
}

module.exports = ConnectDB
