const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the backend folder
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const ElectionSchema = new mongoose.Schema({
    title: String,
    description: String,
    status: String
});

const Election = mongoose.models.Election || mongoose.model('Election', ElectionSchema);

async function removeEngineeringElection() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully.');

        const titlePattern = /Faculty Representative - Engineering/i;
        const election = await Election.findOne({ title: titlePattern });

        if (election) {
            console.log(`Found election: "${election.title}" (ID: ${election._id})`);
            const result = await Election.deleteOne({ _id: election._id });
            console.log(`Deleted ${result.deletedCount} election(s).`);
        } else {
            console.log('No election found matching "Faculty Representative - Engineering".');
            const allElections = await Election.find({}, 'title');
            console.log('Current elections in DB:', allElections.map(e => e.title));
        }

        await mongoose.disconnect();
        console.log('Disconnected.');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeEngineeringElection();
