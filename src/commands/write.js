const inquirer = require('inquirer');
const styles = require('../utils/styles');
const { checkConfig } = require('../utils/config');
const { getRandomPrompt, incrementPromptUsageCount } = require('../utils/prompts');
const { intervalToDuration } = require('date-fns');
const { formatDuration } = require('../utils/format');
const { moods } = require('../data/mood');
const { saveEntry, countWords } = require('../utils/entries');

const EDITOR_PLACEHOLDER = '[Write your reflection here...]';
const MIN_WORDS = 10;

// Remove the editor placeholder so it isn't saved or counted as words
const cleanBody = (input) => input.replace(EDITOR_PLACEHOLDER, '').trim();

const validateBody = (input) =>
  countWords(input) >= MIN_WORDS ||
  styles.warning(
    `Your reflection seems a bit short. Please write at least ${MIN_WORDS} words to capture your thoughts.`
  );

async function writeCommand() {
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

    let body;
    const prompt = await getRandomPrompt();

    const { mood } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mood',
        message: styles.prompt('How are you feeling today?'),
        choices: moods,
      },
    ]);

    const startTime = new Date();
    if (config.user.useEditor) {
      ({ body } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'body',
          message: styles.prompt(prompt.question + '\n'),
          waitUserInput: true,
          default: `\n\n${EDITOR_PLACEHOLDER}`,
          // Editor content is validated after closing the editor
          filter: cleanBody,
          validate: validateBody,
        },
      ]));
    } else {
      ({ body } = await inquirer.prompt([
        {
          type: 'input',
          name: 'body',
          message: styles.prompt(prompt.question + '\n'),
          filter: cleanBody,
          validate: validateBody,
        },
      ]));
    }

    const { tags } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tags',
        message: styles.prompt('Add tags (comma-separated) [optional]:'),
        filter: (input) =>
          input
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
      },
    ]);

    const endTime = new Date();
    const duration = intervalToDuration({ start: startTime, end: endTime });
    const durationString = formatDuration(duration);

    // update the config when entry is also saved...
    const { entry, messages } = await saveEntry({
      prompt,
      body,
      tags,
      mood,
      startTime,
      endTime,
      durationString,
      config,
    });

    // Only count the prompt as used once the entry is actually saved
    await incrementPromptUsageCount(prompt.id);

    console.log(styles.success('✨ Your reflection has been saved!'));
    console.log(styles.help('Word Count: ') + styles.number(entry.content.wordCount));
    console.log(styles.help('Time Spent Writing: ') + styles.number(durationString));
    console.log();
    messages.forEach((message) => console.log(message));
  } catch (error) {
    console.error(styles.error('Error during writing: ') + styles.value(error.message));
    console.log(styles.help('Please try again or report this issue.'));
  }
}

module.exports = writeCommand;
