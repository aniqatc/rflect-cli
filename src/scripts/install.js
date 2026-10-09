const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const styles = require('../utils/styles');

async function createRflectDirectory(isReinstall = false, { quiet = false } = {}) {
  // quiet mode is used when a command repairs a missing setup on the fly
  const log = quiet ? () => {} : console.log;
  try {
    log(styles.header('🚀 Installing rflect'));

    // Directories needed for rflect
    const primaryDirectory = path.join(os.homedir(), '.rflect');
    const entriesDirectory = path.join(primaryDirectory, 'entries');
    await fs.mkdir(primaryDirectory, { recursive: true }); // no duplicates
    await fs.mkdir(entriesDirectory, { recursive: true });

    // Copy of prompts.json inside user's rflect folder
    const sourcePrompts = path.join(__dirname, '../data/prompts.json');
    const targetPrompts = path.join(primaryDirectory, 'prompts.json');
    // Only copy when missing (or on reinstall) so upgrading rflect doesn't wipe prompt usage counts
    let promptsExist = true;
    try {
      await fs.access(targetPrompts);
    } catch {
      promptsExist = false;
    }
    if (isReinstall || !promptsExist) {
      await fs.copyFile(sourcePrompts, targetPrompts);
    }

    log(styles.success('✨ Directory setup complete!'));

    // Initial user config
    const configLocation = path.join(primaryDirectory, 'config.json');
    const config = {
      user: {
        name: '',
        createdAt: new Date().toISOString(),
        useEditor: false, // default is simple input method
      },
      goals: {
        entries: {
          goal: 0,
          type: null, // daily, weekly, monthly
          current: 0,
          periodStart: new Date().toISOString(),
        },
        words: {
          goal: 0,
          type: null, // daily, weekly, monthly
          current: 0,
          periodStart: new Date().toISOString(),
        },
      },
      stats: {
        lastEntry: null,
        currentStreak: 0,
        longestStreak: 0,
        totalEntries: 0,
        totalWords: 0,
        deletedEntries: 0,
        deletedWords: 0,
        writingTime: {
          totalMinutes: 0,
          averageMinutes: 0,
        },
        entriesByPromptCategory: {
          question: 0,
          quote: 0,
          gratitude: 0,
          growth: 0,
          mindfulness: 0,
        },
        tags: {},
        moods: {},
      },
    };

    if (isReinstall) {
      await fs.writeFile(configLocation, JSON.stringify(config, null, 2));
      log(styles.success('Configuration reset to defaults.'));
    } else {
      try {
        await fs.access(configLocation);
        log(styles.info(`Found existing configuration: ${configLocation}`));
        log(styles.info(`Use rflect init or rflect config to make adjustments.`));
      } catch {
        await fs.writeFile(configLocation, JSON.stringify(config, null, 2));
        log(styles.success(`Created initial configuration file: ${configLocation}.`));
      }
    }

    // Welcome and next steps
    log(styles.header('👋🏼 Welcome!'));
    log(styles.info('Get started with:'));
    log(styles.help('1. Initialize your profile:'));
    log(styles.value('   rflect init'));
    log(styles.help('2. Start writing:'));
    log(styles.value('   rflect write'));
    log(styles.help('3. View your entries:'));
    log(styles.value('   rflect show --recent\n'));
    return true;
  } catch (error) {
    console.error(styles.error('\nSetup error: ') + styles.value(error.message));
    return false;
  }
}

module.exports = createRflectDirectory;

// Run on npm install
if (require.main === module) {
  createRflectDirectory();
}
