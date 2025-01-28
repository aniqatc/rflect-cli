const { updateConfig } = require('./config');
const { isToday, isYesterday, parseISO, startOfWeek, startOfMonth } = require('date-fns');
const styles = require('./styles');

async function updateStatsAndGoals(config, entry) {
  try {
    const { stats, messages: statsMessages } = await updateStats(config, entry);
    const { goals, messages: goalMessages } = await updateGoals(config, entry);

    const updatedConfig = {
      ...config,
      stats,
      goals,
    };

    await updateConfig(updatedConfig);
    return {
      config: updatedConfig,
      messages: [...statsMessages, ...goalMessages],
    };
  } catch (error) {
    throw new Error('Failed to update stats and goals. Please check the configuration.');
  }
}

async function updateStats(config, entry) {
  const { content, metadata, prompt } = entry;
  const { wordCount, tags, mood } = content;
  const { durationInMinutes, timestamp } = metadata;
  const now = new Date();
  const messages = [];
  const entryFile = `${timestamp}.json`;

  // new stats object with updated counts
  const stats = {
    ...config.stats,
    totalEntries: config.stats.totalEntries + 1,
    totalWords: config.stats.totalWords + wordCount,
    writingTime: {
      ...config.stats.writingTime,
      totalMinutes: (config.stats.writingTime.totalMinutes || 0) + durationInMinutes,
      averageMinutes: Math.round(
        ((config.stats.writingTime.totalMinutes || 0) + durationInMinutes) /
          (config.stats.totalEntries + 1)
      ),
    },
    entriesByPromptCategory: {
      ...config.stats.entriesByPromptCategory,
      [prompt.category]: (config.stats.entriesByPromptCategory[prompt.category] || 0) + 1,
    },
    tags: {
      ...config.stats.tags,
    },
    moods: {
      ...config.stats.moods,
      [mood]: {
        dates: [...(config.stats.moods[mood]?.dates || []), timestamp],
        files: [...(config.stats.moods[mood]?.files || []), entryFile],
      },
    },
  };

  tags.forEach((tag) => {
    if (!stats.tags[tag]) {
      stats.tags[tag] = { files: [] };
    }
    stats.tags[tag].files.push(entryFile);
  });

  // streak calc
  const lastEntry = config.stats.lastEntry ? parseISO(config.stats.lastEntry) : null;
  if (!lastEntry) {
    stats.currentStreak = 1;
    stats.longestStreak = 1;
    messages.push(styles.success(`🔥 1 day streak! Great start!`));
  } else if (isToday(lastEntry)) {
    messages.push(styles.success(`✍️  Another entry today! Maintain that momentum!`));
  } else if (isYesterday(lastEntry)) {
    stats.currentStreak += 1; // means entries were wrote yesterday & today
    stats.longestStreak = Math.max(stats.currentStreak, stats.longestStreak);
    messages.push(styles.success(`🔥 ${stats.currentStreak} day streak! Keep it up!`));
  } else {
    stats.currentStreak = 1; // reset
    messages.push(styles.info(`🔄 Streak reset. Start a new streak today!`));
  }
  stats.lastEntry = now.toISOString(); // last entry is updated to the newest entry being saved

  // messaging
  if (stats.currentStreak === stats.longestStreak && stats.currentStreak > 1) {
    messages.push(styles.success(`🎉 New record streak!`));
  }

  return { stats, messages };
}

// update goals
async function updateGoals(config, entry) {
  const { wordCount } = entry.content;
  const now = new Date();
  const goals = { ...config.goals };
  const messages = [];

  // Entry count goals (only if it exists)
  if (goals.entries.goal > 0 && goals.entries.type) {
    const periodStart = goals.entries.periodStart ? parseISO(goals.entries.periodStart) : now;

    // check progress timing to determine whether to start a new count or to increment
    if (shouldResetCounter(goals.entries.type, periodStart, now)) {
      goals.entries.current = 1;
      goals.entries.periodStart = now.toISOString();
    } else {
      goals.entries.current = (goals.entries.current || 0) + 1;
    }

    // provide messaging
    const current = goals.entries.current || 0;
    const { goal, type } = goals.entries;
    messages.push(formatGoalMessage(current, goal, type, 'entry'));
  }

  // Word count goals (only if it exists)
  if (goals.words.goal > 0 && goals.words.type) {
    const periodStart = goals.words.periodStart ? parseISO(goals.words.periodStart) : now;

    if (shouldResetCounter(goals.words.type, periodStart, now)) {
      goals.words.current = wordCount;
      goals.words.periodStart = now.toISOString();
    } else {
      goals.words.current = (goals.words.current || 0) + wordCount;
    }

    // provide messaging
    const current = goals.words.current || 0;
    const { goal, type } = goals.words;
    messages.push(formatGoalMessage(current, goal, type, 'words'));
  }
  return { goals, messages };
}

function shouldResetCounter(type, periodStart, now) {
  switch (type) {
    case 'daily':
      return !isToday(periodStart);
    case 'weekly':
      return startOfWeek(now) > periodStart;
    case 'monthly':
      return startOfMonth(now) > periodStart;
    default:
      return false;
  }
}

function formatGoalMessage(progress, goal, type, unit) {
  if (progress >= goal) {
    return styles.success(`🎯 You've met your ${type} ${unit} goal!`);
  }
  const remaining = goal - progress;
  const unitText = unit === 'entry' && remaining !== 1 ? 'entries' : unit;
  return styles.info(`📝 ${remaining} more ${unitText} to reach your ${type} goal`);
}

module.exports = { updateStatsAndGoals };
