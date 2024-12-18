const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const styles = require('../utils/styles');

async function createRflectDirectory(isReinstall = false) {
  try {
    console.log(styles.header(`\n=== 🚀 Installing rflect ===\n`));

    // Directories needed for rflect
    const primaryDirectory = path.join(os.homedir(), '.rflect');
    const entriesDirectory = path.join(primaryDirectory, 'entries');
    await fs.mkdir(primaryDirectory, { recursive: true }); // no duplicates
    await fs.mkdir(entriesDirectory, { recursive: true });
    console.log(styles.success('✨ Directory setup complete!'));

    // Initial user config
    const configLocation = path.join(primaryDirectory, 'config.json');
    const config = {
      user: {
        name: '',
        createdAt: new Date().toISOString(),
        useEditor: false, // default is simple input method
      },
      goals: {
        dailyStreak: {
          current: 0,
          best: 0,
          lastEntryDate: null,
        },
        entries: {
          goal: 0,
          type: null, // daily, weekly, monthly
          current: 0,
          periodStart: null,
        },
        words: {
          goal: 0,
          type: null, // daily, weekly, monthly
          current: 0,
          periodStart: null,
        },
      },
      stats: {
        totalEntries: 0,
        totalWords: 0,
        totalTimeSpent: 0,
        entryCountByPromptType: {
          question: 0,
          quote: 0,
          gratitude: 0,
          growth: 0,
          mindfulness: 0,
        },
      },
      tags: {},
      mood: {},
    };

    if (isReinstall) {
      await fs.writeFile(configLocation, JSON.stringify(config, null, 2));
      console.log(styles.success('Configuration reset to defaults.'));
    } else {
      try {
        await fs.access(configLocation);
        console.log(styles.info(`Found existing configuration: ${configLocation}`));
        console.log(styles.info(`Use rflect init or rflect config to make adjustments.`));
      } catch {
        await fs.writeFile(configLocation, JSON.stringify(config, null, 2));
        console.log(styles.success(`Created initial configuration file: ${configLocation}.`));
      }
    }

    // Welcome and next steps
    console.log(styles.header('\n=== 👋🏼 Welcome to rflect! ==='));
    console.log(styles.info('\nGet started with:'));
    console.log(styles.help('1. Initialize your profile:'));
    console.log(styles.value('   rflect init'));
    console.log(styles.help('2. Start writing:'));
    console.log(styles.value('   rflect write'));
    console.log(styles.help('3. View your entries:'));
    console.log(styles.value('   rflect show --recent\n'));
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
