const { checkConfig } = require('./config');
const styles = require('./styles');
const { format } = require('date-fns');
const Calendar = require('calendar-js');

async function getAllMoods() {
  const { config } = await checkConfig();
  const { moods } = config.stats;

  if (Object.keys(moods).length === 0) {
    console.log(styles.info('\nNo moods recorded.'));
    console.log(styles.help('Start recording moods by using ') + styles.value('rflect write'));
    return;
  }

  console.log(styles.header('All Recorded Moods'));
  Object.keys(moods).forEach((mood) => {
    const count = moods[mood].dates.length;
    const totalEntries = config.stats.totalEntries;
    console.log(
      styles.help(`You were `) +
        styles.value(mood) +
        styles.help(
          ` when writing ${styles.number(count)} entries out of ${styles.number(
            totalEntries
          )} total entries.`
        )
    );
  });
}

async function displayMoodCal(targetMood) {
  const { config } = await checkConfig();
  const { moods } = config.stats;
  const now = new Date();

  if (!moods[targetMood]) {
    console.log(styles.warning(`\nNo entries found with mood: ${targetMood}`));
    return;
  }

  // Timestamps are MM-dd-yyyy-HHmm; match both month and year
  const currentMonth = format(now, 'MM');
  const currentYear = format(now, 'yyyy');
  const moodDates = [
    ...new Set(
      moods[targetMood].dates
        .filter((date) => {
          const [month, , year] = date.split('-');
          return month === currentMonth && year === currentYear;
        })
        .map((date) => parseInt(date.split('-')[1], 10))
    ),
  ];
  const emoji = targetMood.split(' ')[0];
  const monthCalendar = Calendar().of(now.getFullYear(), now.getMonth()).calendar;

  console.log(styles.header(`${targetMood} Calendar: ${format(now, 'MMMM yyyy')}`));
  console.log(styles.value('Su  Mo  Tu  We  Th  Fr  Sa'));

  monthCalendar.forEach((week) => {
    const weekLine = week
      .map((day) => {
        if (day === 0) return '';
        return moodDates.includes(day) ? `${emoji}  ` : `${day.toString().padStart(2)}  `;
      })
      .join('');
    console.log(weekLine);
  });

  const monthCount = moodDates.length;
  console.log(
    styles.help(`\nYou felt `) +
      styles.value(targetMood) +
      styles.help(
        ` on ${styles.number(monthCount)} ${monthCount === 1 ? 'day' : 'days'} this month.`
      )
  );
}

module.exports = { getAllMoods, displayMoodCal };
