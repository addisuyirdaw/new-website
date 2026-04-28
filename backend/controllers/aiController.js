const User = require('../models/User');
const Club = require('../models/Club');
const Feedback = require('../models/Feedback');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.processChatQuery = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Please provide a message' });
    }

    const lowerMsg = message.toLowerCase();
    
    // Greetings check
    const cleanMsg = lowerMsg.replace(/[^a-z ]/g, '').trim();
    if (['hi', 'hello', 'hey', 'who are you'].includes(cleanMsg)) {
      return res.status(200).json({ 
        success: true, 
        answer: 'Hello! I am your DBU Chatbot Assistant. I can help you find clubs, contact academic affairs, or report bugs. What can I help you with today?' 
      });
    }

    // 1. Data Fetching (RAG Context)
    const clubs = await Club.find({}).select('name category description status');
    const admins = await User.find({
      role: { $in: ['academic_affairs', 'clubs_coordinator'] }
    }).select('name email department role');

    const dbData = {
      clubs: clubs,
      faculty_and_coordinators: admins
    };

    // 2. System Prompt Definition
    const systemPrompt = `You are the DBU Chatbot Assistant. Here is the CURRENT list of clubs and staff from our database: ${JSON.stringify(dbData)}. 
    Use this data to answer user questions. If a club isn't in this list, say we don't have information on it yet. 
    Always be professional and supportive of DBU students.`;

    // 3. AI Generation (Gemini)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_api_key_here') {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // Using gemini-pro for high stability across all regions
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      console.log("🚀 Antigravity Model initialized: " + model.model);

      // We combine the system data and user message into one prompt for gemini-pro
      const finalPrompt = `${systemPrompt}\n\nUser Question: ${message}`;

      const result = await model.generateContent(finalPrompt);
      const responseText = result.response.text();

      return res.status(200).json({ success: true, answer: responseText });
      
    } else {
      // Fallback behavior if API key is missing
      console.log('--- RAG SYSTEM PROMPT INJECTION ---');
      console.log(systemPrompt);
      
      await Feedback.create({ query: message });
      
      return res.status(200).json({ 
        success: true, 
        answer: `[Antigravity Sensors Calibrating] I found ${clubs.length} clubs in the database! Please ensure the GEMINI_API_KEY is correctly set in the .env file to enable full AI responses.` 
      });
    }

  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process your request.'
    });
  }
};