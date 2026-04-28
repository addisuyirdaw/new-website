const mongoose = require('mongoose');
const User = require('./models/User');
const Club = require('./models/Club');
require('dotenv').config();

const studentNames = [
    "Abebe Kebede", "Mulugeta Tesfaye", "Selamawit Girma", "Hanna Belay", "Yonas Alemu",
    "Tigist Haile", "Samuel Gebre", "Biniyam Assefa", "Martha Solomon", "Elias Worku",
    "Kassa Tadesse", "Lidya Tekle", "Dawit Mezgebu", "Fasil Demisse", "Rahel Getachew",
    "Tewodros Kassahun", "Birtukan Dubale", "Zelalem Araya", "Meseret Defar", "Haile Gebrselassie"
];

const seedStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connecting to DBU Database...");

        // Clear old mock students to keep it clean
        await User.deleteMany({ role: 'student' });

        const clubs = await Club.find();
        if (clubs.length === 0) {
            console.log("Please run seed_clubs.js first!");
            process.exit();
        }

        let nameIndex = 0;

        for (const club of clubs) {
            console.log(`Assigning students to ${club.name}...`);
            club.members = []; // Reset members for this mock run

            for (let i = 0; i < 5; i++) {
                const name = studentNames[nameIndex % studentNames.length];
                // Format: dbu + 8 random digits
                const username = `dbu${Math.floor(10000000 + Math.random() * 90000000)}`;

                const newUser = await User.create({
                    name: name,
                    username: username, // For the login field
                    email: `${username}@dbu.edu.et`,
                    password: 'Password@2025', // Matches: Upper, Lower, Digit, Symbol, 8+ chars
                    role: 'student',
                    department: club.category || 'General Engineering',
                    year: '2nd Year',
                    studentId: username
                });

                club.members.push({
                    user: newUser._id,
                    fullName: newUser.name,
                    department: newUser.department,
                    year: newUser.year,
                    status: 'approved'
                });
                nameIndex++;
            }
            await club.save();
        }

        console.log("✅ SUCCESS: Mock students created with DBU format!");
        console.log("🔑 Use 'dbuXXXXXXXX' and 'Password@2025' to test login.");
        process.exit();
    } catch (err) {
        console.error("❌ Error seeding students:", err);
        process.exit(1);
    }
};

seedStudents();