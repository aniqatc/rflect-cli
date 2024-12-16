const { isLoggedIn } = require('../utils/auth');
const User = require('../models/user');
const Prompt = require('../models/prompt');
const Entry = require('../models/entry');
const inquirer = require('inquirer');

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function writeCommand() {
    try {
        const session = await isLoggedIn();
        if (!session.isValid) {
            console.log('You are currently not logged in.');
            return;
        }

        const randomPrompt = await Prompt.aggregate([{ $sample: { size: 1 } }]);
        const prompt = randomPrompt[0];

        await Prompt.updateOne({ _id: prompt._id }, { $inc: { usageCount: 1 }});

        const startTime = Date.now();
        const response = await inquirer.prompt([
            {
                type: 'input',
                name: 'response',
                message: prompt.question,
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Provide a response.';
                    }
                    return true;
                },
            },
        ]);
        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - startTime) / 60000);
        const wordCount = countWords(response.response);
        const creationDate = new Date().toISOString();

        const user = await User.findOne({ username: session.username });
        if (user) {
            await User.updateOne({ _id: user._id }, { $inc: { entryCount: 1 }});
        }

        const entry = new Entry({
            userId: user._id,
            promptId: prompt._id,
            content: response.response,
            duration: durationMinutes,
            wordCount: wordCount,
            createdAt: creationDate
        });

        if (user.storagePreference === "both" || user.storagePreference === "cloud") {
            await entry.save();
        }

        if (user.storagePreference === "both" || user.storagePreference === "local") {
            const entriesDir = path.join(os.homedir(), '.rflect', 'entries');
            await fs.mkdir(entriesDir, { recursive: true });

            const filename = `${creationDate.replace(/:/g, '-')}_entry.txt`;
            const filePath = path.join(entriesDir, filename);

            await fs.writeFile(filePath, JSON.stringify({
                userId: user._id.toString(),
                promptId: prompt._id.toString(),
                promptQuestion: prompt.question,
                content: response.response,
                duration: durationMinutes,
                wordCount: wordCount,
                createdAt: creationDate
            }));
        }

        user.storagePreference === "both"
            ? console.log(`Thank you for your reflection. That only took ${durationMinutes} minute(s). Your entry has been saved locally and in the cloud.`)
                : ( user.storagePreference === "local"
                    ? console.log(`Thank you for your reflection. That only took ${durationMinutes} minutes. Your entry has been saved locally.`)
                    : console.log(`Thank you for your reflection. That only took ${durationMinutes} minutes. Your entry has been saved to the cloud.`));
    } catch (error) {
        // Error messaging
        console.log('Reflection prompt failed: ', error.message);
    }
}

function countWords(text) {
    // regex: all types of whitespace characters
    return text.trim().split(/\s+/).length;
}

module.exports = writeCommand;