// API Configuration Template
// INSTRUCTIONS:
// 1. Copy this file and rename it to 'config.js'
// 2. Replace 'YOUR_API_KEY_HERE' with your actual Gemini API key
// 3. Never commit config.js to version control (it's in .gitignore)

const CONFIG = {
    GEMINI_API_KEY: 'YOUR_API_KEY_HERE',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
};

// For Vercel deployment:
// - Do NOT add your API key here
// - Instead, add it as an environment variable in Vercel dashboard
// - Variable name: GEMINI_API_KEY
// - See DEPLOYMENT_GUIDE.md for detailed instructions
