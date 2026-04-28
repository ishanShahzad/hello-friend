require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testHerokuAPI() {
    try {
        // User's ID from database
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
        
        console.log('🔑 Testing with JWT Token for user: a@gmail.com');
        console.log('📤 Making API call to: https://tortrose-backend-496a749db93a.herokuapp.com/api/stores/my-store');
        
        // Make the API call to Heroku
        const response = await axios.get('https://tortrose-backend-496a749db93a.herokuapp.com/api/stores/my-store', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('\n✅ API Response:');
        console.log('Status:', response.status);
        console.log('Message:', response.data.msg);
        console.log('Store Name:', response.data.store?.storeName);
        console.log('Store Slug:', response.data.store?.storeSlug);
        console.log('Store Active:', response.data.store?.isActive);
        console.log('\n✅ SUCCESS - Store found on Heroku backend!');
        
    } catch (error) {
        console.error('\n❌ API Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Message:', error.response.data?.msg);
            console.error('Full Response:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received from server');
            console.error('Error:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testHerokuAPI();
