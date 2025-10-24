
const axios = require('axios')

const HF_API_KEY = process.env.HF_API_KEY

async function callHF(prompt) {
    try {

        const res = await axios.post("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct",
            {
                inputs: prompt,
                parameters: {
                    max_new_tokens: 200,
                    temprature: 0.2
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        return res.data[0]?.generated_text || ""
    } catch (error) {
        console.error('HF api error', error);
    }

}

module.exports = { callHF }