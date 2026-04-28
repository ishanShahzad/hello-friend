require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testAPICall() {
    try {
        // Find the user's ID from our debug script
        const userId = '68fb7060b2988c43aa7699c5';
        
        // Create a JWT token like the login does
        const payload = {
            id: userId,
            username: '03028588506',
            email: 'a@gmail.com',
            role: 'seller',
            avatar: 'https://res.cloudinary.com/dus5sac8g/image/upload/v1756983317/Profile_Picture_dxq4w8.jpg'
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        
        console.log('🔑 Generated JWT Token:');
        console.log(token);
        console.log('\n📤 Making API call to: http://localhost:5000/api/store/my-store');
        
        // Make the API call
        const response = await axios.get('http://localhost:5000/api/store/my-store', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('\n✅ API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('\n❌ API Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAPICall();
