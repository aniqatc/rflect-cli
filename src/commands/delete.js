const { checkConfig, updateConfig } = require('../utils/config');
const {
  deleteAllEntries,
  deleteEntryByFileName,
  getEntryDates,
  getEntryByFileName,
} = require('../utils/entries');
const { removeEntryFromStats } = require('../utils/stats');
const styles = require('../utils/styles');
const inquirer = require('inquirer');

async function deleteCommand(options) {
  try {
    const { isFirstTime, config } = await checkConfig();
    if (isFirstTime) {
      console.log(styles.warning(`\nWelcome to rflect! Let's get you set up first.`));
      console.log(
        styles.info('Run ') +
          styles.value('rflect init') +
          styles.info(' to start your reflection journey.')
      );
      return;
    }

    if (!options.all && !options.date) {
      console.log(styles.help('Available options:'));
      console.log(styles.value('  rflect delete --all      ') + styles.info('Remove all entries'));
      console.log(
        styles.value('  rflect delete --date     ') +
          styles.info('Remove entries from specific date')
      );
      return;
    }

    if (options.all) {
      const { firstConfirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'firstConfirm',
          message: styles.warning(
            `⚠️ PERMANENT DELETION WARNING\n\nThis action will completely remove ALL of your journal entries from your computer.\n- This cannot be undone\n- ALL journal entries will be permanently deleted\n- This includes ALL saved entries across ALL dates\n\nAre you absolutely certain you want to proceed?`
          ),
          default: false,
        },
      ]);

      if (firstConfirm) {
        const { finalConfirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'finalConfirm',
            message: styles.warning(
              `🚨 FINAL CONFIRMATION\n\nYou are about to permanently delete EVERYTHING:\n- ALL journal entries will be IRREVERSIBLY ERASED\n- No recovery is possible\n\nDO YOU WANT TO CONTINUE?`
            ),
            default: false,
          },
        ]);

        if (finalConfirm) {
          const deletedFileCount = await deleteAllEntries();
          const totalEntryCount = config.stats.totalEntries;
          config.stats.deletedEntries += totalEntryCount;

          const totalWordCount = config.stats.totalWords;
          config.stats.deletedWords += totalWordCount;

          config.stats.totalEntries = 0;
          config.stats.totalWords = 0;
          // No entries remain, so the tag/mood/category indexes would only point at deleted files
          config.stats.tags = {};
          config.stats.moods = {};
          config.stats.entriesByPromptCategory = Object.fromEntries(
            Object.keys(config.stats.entriesByPromptCategory || {}).map((category) => [category, 0])
          );

          await updateConfig(config);

          console.log(styles.success(`Deleted ${deletedFileCount} entries.`));
          console.log('\n' + styles.info('🔄 Recommendation:'));
          console.log(
            styles.help('  - Use ') +
              styles.value('rflect init') +
              styles.help(' to reset your account settings and start a fresh reflection journey.')
          );
          console.log(
            styles.help('  - This will help you reconfigure your preferences and goals.')
          );
        }
      }
    }

    if (options.date) {
      const dates = await getEntryDates();
      if (dates.length === 0) {
        console.log(styles.info('\nNo entries to delete.'));
        return;
      }
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedEntry',
          message: styles.prompt(`Select the date/time of the entry you'd like to DELETE: `),
          choices: dates.map((date) => ({
            name: date.dateString,
            value: {
              filename: date.filename,
              dateString: date.dateString,
            },
          })),
        },
        {
          type: 'confirm',
          name: 'confirmation',
          message: (answers) =>
            styles.warning(
              `WARNING: This action cannot be undone. Are you sure you want to delete the entry from ${answers.selectedEntry.dateString}?`
            ),
          default: false,
        },
      ]);
      if (answers.confirmation) {
        const fileToDelete = await getEntryByFileName(answers.selectedEntry.filename);
        await deleteEntryByFileName(answers.selectedEntry.filename);
        config.stats.totalEntries = config.stats.totalEntries - 1;
        config.stats.deletedEntries = config.stats.deletedEntries + 1;
        config.stats.deletedWords = config.stats.deletedWords + fileToDelete.content.wordCount;
        config.stats.totalWords = config.stats.totalWords - fileToDelete.content.wordCount;
        const category = fileToDelete.prompt && fileToDelete.prompt.category;
        if (category && config.stats.entriesByPromptCategory[category] > 0) {
          config.stats.entriesByPromptCategory[category] -= 1;
        }
        config.stats = removeEntryFromStats(config.stats, answers.selectedEntry.filename);
        await updateConfig(config);
        console.log(
          styles.success(`Entry from ${answers.selectedEntry.dateString} deleted successfully.`)
        );

        const remainingEntries = await getEntryDates();
        if (remainingEntries.length === 0) {
          console.log('\n' + styles.info('🔄 Recommendation:'));
          console.log(
            styles.help('  - No entries remain. Consider using ') +
              styles.value('rflect init') +
              styles.help(' to reset your account settings.')
          );
          console.log(
            styles.help('  - This will help you reconfigure your preferences and goals.')
          );
        }
      }
    }
  } catch (error) {
    console.error(styles.error('Error during deletion: ') + styles.value(error.message));
    console.log(styles.help('Please try again or report this issue.'));
  }
}

module.exports = deleteCommand;
