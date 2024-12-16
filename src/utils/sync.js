const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const Entry = require('../models/entry');
const Prompt = require('../models/prompt');
const entriesDir = path.join(os.homedir(), '.rflect', 'entries');

async function migrateCloudToLocal(userId) {
    let migratedCount = 0;
    await fs.mkdir(entriesDir, { recursive: true });

    try {
        const cloudEntries = await Entry.find({ userId }).populate('promptId');
        for (const entry of cloudEntries) {
            const filename = `${entry.createdAt.toISOString().replace(/:/g, '-')}_entry.txt`;
            const filePath = path.join(entriesDir, filename);

            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, JSON.stringify({
                    userId: entry.userId.toString(),
                    promptId: entry.promptId._id.toString(),
                    promptQuestion: entry.promptId.question,
                    content: entry.content,
                    duration: entry.duration,
                    wordCount: entry.wordCount,
                    createdAt: entry.createdAt.toISOString()
                }));
                migratedCount++;
                console.log(`Migrated entry from cloud storage to ${filename}.`);
            }
        }
        console.log(`Migration complete. ${migratedCount} entries migrated to local storage.`);
    } catch (error) {
        console.log('Error migrating cloud entries to local storage:', error.message);
    }
}

async function migrateLocalToCloud(userId) {
    let migratedCount = 0;

    try {
        const files = await fs.readdir(entriesDir);
        for (const file of files) {
            if (file.startsWith(".")) {
                continue;
            }
            const filePath = path.join(entriesDir, file);
            const fileContent = await fs.readFile(filePath, 'utf8');
            // Attempt to parse JSON
            let entry;
            try {
                entry = JSON.parse(fileContent);
            } catch (parseError) {
                console.log(`Error parsing file ${file}: ${parseError.message}`);
                continue;
            }

            const prompt = await Prompt.findOne({ question: entry.promptQuestion });
            const existingEntry = await Entry.findOne({
                userId: userId,
                duration: entry.duration,
                wordCount: entry.wordCount,
                promptId: prompt._id,
                createdAt: entry.createdAt
            });

            if (!existingEntry) {
                const newEntry = new Entry({
                    userId: userId,
                    promptId: prompt._id,
                    content: entry.content,
                    duration: entry.duration,
                    wordCount: entry.wordCount,
                    createdAt: entry.createdAt
                });
                await newEntry.save();
                migratedCount++;
                console.log(`Migrated entry from ${file} to cloud.`);
            }
        }
        console.log(`Migration complete. ${migratedCount} entries migrated to local storage.`);
    } catch (error) {
        // Error messaging
        if (error.code === "ENOENT") {
            console.log("No local entries found to migrate.");
        } else {
            console.log('Error migrating local entries to cloud storage: ', error.message);
        }
    }
}

module.exports = { migrateCloudToLocal, migrateLocalToCloud };