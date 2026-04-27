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
        answer: 'Hello! I am your DBU Student Union Assistant. I can help you find clubs, contact academic affairs, or report bugs. What can I help you with today?' 
      });
    }

    // 1. Data Fetching (RAG Context)
    // Fetch clubs to inject into the system prompt
    const clubs = await Club.find({}).select('name category description status');
    
    // Also fetch staff/admins if requested, to make it fully DB-aware
    const admins = await User.find({
      role: { $in: ['academic_affairs', 'clubs_coordinator'] }
    }).select('name email department role');

    // 2. System Prompt Injection
    const dbData = {
      clubs: clubs,
      faculty_and_coordinators: admins
    };

    const systemPrompt = `You are the DBU Student Union Pilot Assistant. Here is the CURRENT list of clubs and staff from our database: ${JSON.stringify(dbData)}. Use this data to answer user questions. If a club isn't in this list, say we don't have information on it yet. Always be professional and supportive of DBU students.`;

    // 3. AI Generation (Gemini/OpenAI) using Environment Safety (API Keys from .env)
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // We pass the System Prompt via systemInstruction (supported in flash model)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt 
      });

      const result = await model.generateContent(message);
      const responseText = result.response.text();

      return res.status(200).json({ success: true, answer: responseText });
      
    } else {
      // Fallback behavior if developer hasn't put API key in yet
      console.log('--- RAG SYSTEM PROMPT INJECTION ---');
      console.log(systemPrompt);
      console.log('-----------------------------------');
      
      // Still attempt to log to feedback if it's not a greeting
      await Feedback.create({ query: message });
      
      return res.status(200).json({ 
        success: true, 
        answer: `[API Keys Missing] I fetched ${clubs.length} clubs and ${admins.length} admins from the database to use as context for Gemini! \n\nPlease add your GEMINI_API_KEY to the backend .env file to enable full AI responses. Your query has been safely logged.` 
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
