// API Configuration - works both locally and on Vercel
// Check if we're in production (Vercel) or local development
const isProduction = window.location.hostname !== 'localhost' &&
    window.location.hostname !== '' &&
    !window.location.hostname.includes('127.0.0.1') &&
    !window.location.protocol.includes('file');

// Use serverless function in production, direct API locally
const API_URL = isProduction
    ? '/api/generate'  // Vercel serverless function
    : (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');

const API_KEY = (typeof CONFIG !== 'undefined') ? CONFIG.GEMINI_API_KEY : null;


const form = document.getElementById('solverForm');
const submitBtn = document.getElementById('submitBtn');
const responseSection = document.getElementById('responseSection');
const loadingIndicator = document.getElementById('loadingIndicator');
const responseContent = document.getElementById('responseContent');
const copyBtn = document.getElementById('copyBtn');

// Chatbot Elements
const chatWidget = document.getElementById('chatWidget');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatWindow = document.getElementById('chatWindow');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

let selectedImageBase64 = null;
let selectedImageMimeType = null;
let chatHistory = [];

// Chatbot Toggle
chatToggleBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden');
});

closeChatBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
});

// Chat Message Handling
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Add User Message
    addMessage(message, 'user');
    chatInput.value = '';

    // Show Typing Indicator
    const typingId = addTypingIndicator();

    try {
        // Construct History for API
        const history = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Add current message
        history.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // System Instruction
        if (chatHistory.length === 0) {
            history.unshift({
                role: 'user',
                parts: [{ text: "You are an expert academic mentor. Your goal is to help the user understand concepts deeply. Be accurate, patient, and clear. Use step-by-step explanations for complex problems." }]
            });
            history.splice(1, 0, {
                role: 'model',
                parts: [{ text: "Understood. I am ready to help you master this subject with accurate and clear guidance." }]
            });
        }

        // Build headers - only include API key in local development
        const headers = { 'Content-Type': 'application/json' };
        if (!isProduction && API_KEY) {
            headers['x-goog-api-key'] = API_KEY;
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                contents: history
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;

        // Remove Typing Indicator
        removeMessage(typingId);

        // Add AI Message
        addMessage(aiText, 'ai');

    } catch (error) {
        console.error(error);
        removeMessage(typingId);
        addMessage(`Error: ${error.message || "Connection failed"}`, 'ai');
    }
});

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', `${sender}-message`);

    if (sender === 'ai') {
        div.innerHTML = marked.parse(text);
    } else {
        div.textContent = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    chatHistory.push({ role: sender, text: text });
}

function addTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.classList.add('message', 'ai-message');
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Image Upload Handling
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            selectedImageBase64 = e.target.result.split(',')[1];
            selectedImageMimeType = file.type;
        };
        reader.readAsDataURL(file);
    }
});

removeImageBtn.addEventListener('click', () => {
    imageInput.value = '';
    imagePreviewContainer.classList.add('hidden');
    selectedImageBase64 = null;
    selectedImageMimeType = null;
});

form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});

// Main Solver Form Handling
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check for API Key in local development
    if (!isProduction && !API_KEY) {
        alert('API Key is missing! Please add your GEMINI_API_KEY to config.js');
        return;
    }

    const question = document.getElementById('question').value;
    const subject = document.getElementById('subject').value;
    const level = document.getElementById('level').value;
    const language = document.getElementById('language').value;
    const notes = document.getElementById('notes').value;

    if (!question && !selectedImageBase64) {
        alert('Please enter a question or upload an image.');
        return;
    }

    // UI Updates
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width: 25px; height: 25px; border-width: 3px;"></span>';
    responseSection.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    responseContent.innerHTML = '';

    // Construct Prompt with Maximum Accuracy Focus
    let promptText = `# ROLE
You are an expert academic tutor with deep knowledge across all subjects. Your primary responsibility is ACCURACY above all else.

# CORE PRINCIPLES
1. **NEVER GUESS OR HALLUCINATE** - If you don't know something with certainty, explicitly state "I'm not certain about this" or "This requires verification"
2. **FACT-CHECK YOURSELF** - Before stating any fact, verify it mentally against your knowledge
3. **SHOW YOUR REASONING** - Every step must be justified with clear logic
4. **ADMIT LIMITATIONS** - If a problem is ambiguous or lacks information, point this out
5. **USE RELIABLE METHODS** - Stick to established formulas, theorems, and principles

# TASK
Solve the following homework problem with absolute precision and clarity.

**Subject:** ${subject}
**Level:** ${level}
**Language:** ${language}
`;
    if (question) promptText += `**Question:** ${question}\n`;
    if (notes) promptText += `**Additional Notes:** ${notes}\n`;

    promptText += `\n# METHODOLOGY
You MUST follow this exact structure:

## 1. Problem Understanding & Analysis
- Read the problem carefully and identify what is being asked
- List ALL given information explicitly
- Identify what needs to be found
- If an image is provided, describe all relevant details you can extract from it
- State any assumptions you need to make (and why they're reasonable)
- Identify the core concepts, formulas, or principles that apply

## 2. Solution Strategy
- Outline your approach BEFORE solving
- Explain WHY this approach will work
- Mention alternative methods if applicable

## 3. Step-by-Step Solution
- Execute your solution with clear, numbered steps
- Show ALL calculations - do not skip steps
- Explain the reasoning behind each step
- Use proper mathematical notation (LaTeX format: $$...$$ for display, $...$ for inline)
- Double-check each calculation as you go
- If you make an assumption, clearly state it

## 4. Verification & Quality Check
- Review your solution for mathematical errors
- Verify the answer makes logical/physical sense (check units, magnitude, sign)
- If possible, verify using an alternative method or by substituting back
- State your confidence level (High/Medium/Low) and explain why

## 5. Final Answer
- Present the final answer in a clear, highlighted block using this format:
  **FINAL ANSWER:** [Your answer here]
- Include proper units if applicable
- Summarize the key concept or learning point

# CRITICAL ACCURACY RULES
⚠️ **MANDATORY REQUIREMENTS:**
1. If you're uncertain about ANY fact, formula, or concept - SAY SO explicitly
2. Never make up formulas, dates, facts, or definitions
3. If the problem is ambiguous or missing information, point this out
4. For factual questions (history, science facts, etc.), only state what you're certain about
5. Use standard, well-established methods - don't invent new approaches
6. Double-check all arithmetic and algebraic manipulations
7. Verify your final answer makes sense in the context of the problem

# FORMATTING REQUIREMENTS
- Use Markdown for structure
- Use LaTeX for ALL mathematical expressions
- Use **bold** for key terms and the final answer
- Use proper headings (##, ###) for organization
- Make the output visually clear and easy to follow
`;

    if (selectedImageBase64) {
        promptText += "\n**[Image Analysis Required]**: An image has been uploaded. Carefully analyze all visual information and incorporate it into your solution.";
    }

    const requestBody = {
        contents: [{
            parts: [{ text: promptText }]
        }]
    };

    // Add image part if exists
    if (selectedImageBase64) {
        requestBody.contents[0].parts.push({
            inline_data: {
                mime_type: selectedImageMimeType,
                data: selectedImageBase64
            }
        });
    }

    try {
        // Build headers - only include API key in local development
        const headers = { 'Content-Type': 'application/json' };
        if (!isProduction && API_KEY) {
            headers['x-goog-api-key'] = API_KEY;
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || errorData.message || response.statusText;
            throw new Error(`API Error: ${errorMessage}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        // Render Markdown and Math
        loadingIndicator.classList.add('hidden');
        responseContent.innerHTML = marked.parse(generatedText);
        renderMathInElement(responseContent, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ]
        });

    } catch (error) {
        console.error(error);
        loadingIndicator.classList.add('hidden');
        responseContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">➤</span>';
        responseSection.scrollIntoView({ behavior: 'smooth' });
    }
});

copyBtn.addEventListener('click', () => {
    const text = responseContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});
