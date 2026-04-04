#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Run this to check if all required environment variables are set
 * Usage: node verify-env.js
 */

require('dotenv').config();

const requiredVars = [
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'clientID',
  'clientSecret',
  'GOOGLE_CALLBACK_URL',
  'BREVO_API_KEY',
  'BREVO_SENDER_NAME',
  'BREVO_SENDER_EMAIL'
];

const optionalVars = [
  'HF_API_KEY',
  'TRUST_PROXY_HOPS',
  'PORT'
];

console.log('🔍 Verifying Environment Variables...\n');

let missingRequired = [];
let missingOptional = [];
let foundRequired = [];
let foundOptional = [];

// Check required variables
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    foundRequired.push(varName);
    console.log(`✅ ${varName}: Set`);
  } else {
    missingRequired.push(varName);
    console.log(`❌ ${varName}: MISSING (Required)`);
  }
});

console.log('\n--- Optional Variables ---\n');

// Check optional variables
optionalVars.forEach(varName => {
  if (process.env[varName]) {
    foundOptional.push(varName);
    console.log(`✅ ${varName}: Set`);
  } else {
    missingOptional.push(varName);
    console.log(`⚠️  ${varName}: Not set (Optional)`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Required variables found: ${foundRequired.length}/${requiredVars.length}`);
console.log(`⚠️  Optional variables found: ${foundOptional.length}/${optionalVars.length}`);

if (missingRequired.length > 0) {
  console.log('\n❌ MISSING REQUIRED VARIABLES:');
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n⚠️  Your application may not work correctly!');
  console.log('📝 Please set these variables in your .env file or Heroku Config Vars.\n');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  console.log('🚀 Your application should work correctly.\n');
  
  if (missingOptional.length > 0) {
    console.log('ℹ️  Optional variables not set:');
    missingOptional.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('   (These are optional and won\'t affect core functionality)\n');
  }
  
  process.exit(0);
}
