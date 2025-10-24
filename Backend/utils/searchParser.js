

const { callHF } = require('./hfClient')

async function parseSearchQuery(searchText) {
    const schema = `
You are a query parser for an ecommerce site.
Extract information into this JSON schema:

{
  "category": string or null,
  "brand": string or null,
  "priceMin": number or null,
  "priceMax": number or null,
  "keywords": array of strings
}

Rules:
- If user says "under X", set priceMax = X.
- If "above X" or "over X", set priceMin = X.
- If "between X and Y", set both priceMin and priceMax.
- Put product type in "category".
- Extract brand names if mentioned.
- Remaining words go into "keywords".
- Only return valid JSON, no explanations.
`;
    const prompt = `${schema}\n\nUser query: "${searchText}"\n\nOutput JSON:`;

    try {
        const raw = await callHF(prompt);

        // Extract only JSON from model’s response
        const jsonStart = raw.indexOf("{");
        const jsonEnd = raw.lastIndexOf("}");
        const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

        return parsed;
    } catch (err) {
        console.error("Parser failed, using fallback regex:", err.message);
    }
}


module.exports = { parseSearchQuery }



