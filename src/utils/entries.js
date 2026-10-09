const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { format, differenceInMinutes, parse } = require('date-fns');
const { updateStatsAndGoals } = require('./stats');

const getEntriesDir = () => path.join(os.homedir(), '.rflect', 'entries');

// Writes the entry without overwriting an existing file; two entries saved in the
// same minute get a numeric suffix (e.g. 10-08-2026-0100-2.json)
async function writeUniqueEntryFile(dir, timestamp, data) {
  for (let attempt = 1; attempt < 100; attempt++) {
    const filename = attempt === 1 ? `${timestamp}.json` : `${timestamp}-${attempt}.json`;
    try {
      await fs.writeFile(path.join(dir, filename), data, { flag: 'wx' });
      return filename;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Too many entries saved in the same minute');
}

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

async function saveEntry({
  prompt,
  body,
  tags = [],
  mood,
  startTime,
  endTime,
  durationString,
  config,
}) {
  const timestamp = format(startTime, 'MM-dd-yyyy-HHmm');
  const durationInMinutes = differenceInMinutes(endTime, startTime);
  const parsedDate = parse(timestamp, 'MM-dd-yyyy-HHmm', new Date());
  const dateString = format(parsedDate, "MMM dd yyyy 'at' h:mm a");

  const entry = {
    prompt,
    content: {
      body,
      wordCount: countWords(body),
      tags,
      mood,
    },
    metadata: {
      timestamp,
      durationInMinutes,
      durationString,
      created: startTime.toISOString(),
      dateString,
    },
  };

  try {
    // Save the entry file
    const entriesDir = getEntriesDir();
    await fs.mkdir(entriesDir, { recursive: true });
    const filename = await writeUniqueEntryFile(
      entriesDir,
      timestamp,
      JSON.stringify(entry, null, 2)
    );

    // Update stats and get messages
    const { messages } = await updateStatsAndGoals(config, entry, filename);
    return {
      entry,
      messages,
    };
  } catch (error) {
    throw new Error(`Failed to save entry: ${error.message}`);
  }
}

// Returns every entry, oldest first, each with the file it came from
async function getAllEntries() {
  try {
    const entriesDir = getEntriesDir();
    let files;
    try {
      files = await fs.readdir(entriesDir);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    const entries = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filePath = path.join(entriesDir, filename);
        const content = await fs.readFile(filePath, 'utf8');
        return { ...JSON.parse(content), filename };
      })
    );
    // Filenames are MM-dd-yyyy, which don't sort across years, so sort by creation time
    return entries.sort(
      (a, b) => new Date(a.metadata.created).getTime() - new Date(b.metadata.created).getTime()
    );
  } catch (error) {
    throw new Error(`Failed to read entries: ${error.message}`);
  }
}

async function getEntryDates() {
  try {
    const entries = await getAllEntries();
    return entries.map((entry) => {
      return {
        filename: entry.filename,
        dateString: entry.metadata.dateString,
        created: entry.metadata.created,
      };
    });
  } catch (error) {
    throw new Error(`Failed to read entries: ${error.message}`);
  }
}

async function getEntryByTag(tag) {
  try {
    const entries = await getAllEntries();
    return entries.filter((entry) => (entry.content.tags || []).includes(tag));
  } catch (error) {
    throw new Error(`Failed to read entries: ${error.message}`);
  }
}

async function getEntryByMood(mood) {
  try {
    const entries = await getAllEntries();
    return entries.filter((entry) => entry.content.mood === mood);
  } catch (error) {
    throw new Error(`Failed to read entries: ${error.message}`);
  }
}

async function getEntryByPromptCategory(category) {
  try {
    const entries = await getAllEntries();
    return entries.filter((entry) => entry.prompt.category === category);
  } catch (error) {
    throw new Error(`Failed to read entries: ${error.message}`);
  }
}

async function getEntryByFileName(filename) {
  const filePath = path.join(getEntriesDir(), filename);
  const file = await fs.readFile(filePath, 'utf8');
  return { ...JSON.parse(file), filename };
}

async function getLastEntry() {
  try {
    const entries = await getAllEntries(); // already sorted oldest first
    return entries.length > 0 ? entries[entries.length - 1] : null;
  } catch (error) {
    throw new Error(`Failed to read entries: ${error.message}`);
  }
}

async function getShortestLongestEntryDuration() {
  try {
    const entries = await getAllEntries();
    if (entries.length === 0) {
      return null;
    }

    const sortedByDuration = entries.sort(
      (a, b) => a.metadata.durationInMinutes - b.metadata.durationInMinutes
    );

    return {
      shortest: sortedByDuration[0],
      longest: sortedByDuration[sortedByDuration.length - 1],
    };
  } catch (error) {
    throw new Error(`Failed to get entry duration statistics: ${error.message}`);
  }
}

async function deleteAllEntries() {
  try {
    let deletedCount = 0;
    const entriesDir = getEntriesDir();
    let files;
    try {
      files = await fs.readdir(entriesDir);
    } catch (error) {
      if (error.code === 'ENOENT') return 0;
      throw error;
    }
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      await fs.unlink(path.join(entriesDir, file));
      deletedCount++;
    }
    return deletedCount;
  } catch (error) {
    throw new Error(`Failed to delete entries: ${error.message}`);
  }
}

async function deleteEntryByFileName(filename) {
  try {
    await fs.unlink(path.join(getEntriesDir(), filename));
  } catch (error) {
    throw new Error(`Failed to delete entry: ${error.message}`);
  }
}

module.exports = {
  countWords,
  saveEntry,
  getEntryDates,
  getAllEntries,
  getEntryByTag,
  getEntryByMood,
  getEntryByPromptCategory,
  getEntryByFileName,
  getLastEntry,
  getShortestLongestEntryDuration,
  deleteAllEntries,
  deleteEntryByFileName,
};
