const { checkConfig } = require('./config');
const styles = require('./styles');

async function getAllTags() {
  const { config } = await checkConfig();
  const { tags } = config.stats;

  if (Object.keys(tags).length === 0) {
    console.log(styles.info('\nNo tags found.'));
    console.log(styles.help('Start adding tags to your entries when writing: rflect write'));
    return;
  }

  console.log(styles.header('\n=== All Tags ===\n'));
  console.log("Here are ALL the tags that you have used across your entries and the number of times it was used:");
  for (const [tag, count] of Object.entries(tags)) {
    console.log(styles.value(`#${tag}`) + styles.info(` used in ${styles.number(count)} ${count === 1 ? 'entry' : 'entries'}`));
  }
}

async function getTopFiveTags() {
  const { config } = await checkConfig();
  const { tags } = config.stats;

  if (Object.keys(tags).length === 0) {
    console.log(styles.info('\nNo tags found.'));
    console.log(styles.help('Start adding tags to your entries when writing: rflect write'));
    return;
  }

  console.log(styles.header('\n=== Most Used Tags ===\n'));
  console.log("Here are the top 5 tags that you have used the most in your entries:");
  const sortedTags = Object.entries(tags).sort(([, a], [, b]) => b - a).slice(0, 5);
  sortedTags.forEach(tag => {
    console.log(styles.value(`#${tag[0]}`) + styles.info(` used in ${styles.number(tag[1])} ${tag[1] === 1 ? 'entry' : 'entries'}`));
  })
  console.log(styles.help('\nUse rflect tags --all to see all tags'));
}

module.exports = { getAllTags, getTopFiveTags };