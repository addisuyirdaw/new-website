const User = require('../models/User');
const Club = require('../models/Club');
const Feedback = require('../models/Feedback');

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

    // Core Identity
    const systemPrompt = "Hello! I am the DBU Student Union Pilot Assistant for the '21' system.";

    // 1. Coordinators & Academic Affairs (Admin search)
    if (
      lowerMsg.includes('coordinator') || 
      lowerMsg.includes('academic') || 
      lowerMsg.includes('affair') ||
      lowerMsg.includes('dbu10101021') ||
      lowerMsg.includes('admin')
    ) {
      const admins = await User.find({
        role: { $in: ['academic_affairs', 'clubs_coordinator'] }
      }).select('name email department role username');

      if (admins.length > 0) {
        const staffDocs = admins.map(admin => {
            const title = admin.role === 'academic_affairs' ? 'Academic Affairs Admin' : 'Clubs Coordinator';
            return `- Name: ${admin.name}, Title: ${title}, Email: ${admin.email}, Department: ${admin.department}`;
        }).join('\n');
        return res.status(200).json({ success: true, answer: `${systemPrompt} Here is the contact info for the requested administrative staff:\n${staffDocs}` });
      }
    }

    // 2. Club Search based on message contents
    const activeClubs = await Club.find({ status: 'active' }).select('name category description');

    // Soft match based on unique words in club names
    let matchedClubs = activeClubs.filter(club => {
       if (lowerMsg.includes(club.name.toLowerCase())) return true;
       
       const clubWords = club.name.toLowerCase().replace('club', '').replace('association', '').trim().split(' ');
       return clubWords.some(w => w.length > 2 && lowerMsg.includes(w));
    });

    const isGenericClubQuery = lowerMsg === 'club' || lowerMsg === 'clubs' || lowerMsg === 'list clubs' || lowerMsg === 'show clubs';

    if (matchedClubs.length > 0 && !isGenericClubQuery) {
      const clubNames = matchedClubs.map(c => `- ${c.name} (${c.category}): ${c.description}`).join('\n');
      return res.status(200).json({ success: true, answer: `${systemPrompt} I found the following club details matching your query:\n${clubNames}` });
    }

    if (lowerMsg.includes('club')) {
      if (activeClubs.length === 0) {
         return res.status(200).json({ success: true, answer: `${systemPrompt} There are currently no active clubs available.` });
      }
      const clubNames = activeClubs.map(c => `- ${c.name} (${c.category})`).join('\n');
      return res.status(200).json({ success: true, answer: `${systemPrompt} Here are the active clubs:\n${clubNames}` });
    }

    // Default Fallback: Add to Feedback
    await Feedback.create({ query: message });
    
    return res.status(200).json({
      success: true,
      answer: `${systemPrompt} I'm currently unable to answer that question. Your query has been logged and our team will use it to improve my knowledge in the future!`
    });

  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process your request.'
    });
  }
};
