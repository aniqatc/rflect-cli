const {
  getCurrentStreak,
  removeEntryFromStats,
  shouldResetCounter,
} = require('../../src/utils/stats');
const { countWords } = require('../../src/utils/entries');

describe('getCurrentStreak', () => {
  const now = new Date(2026, 9, 8, 12); // Oct 8, 2026 at noon
  const statsWith = (lastEntry, currentStreak = 5) => ({
    lastEntry: lastEntry && lastEntry.toISOString(),
    currentStreak,
  });

  test('keeps the streak when the last entry was today', () => {
    expect(getCurrentStreak(statsWith(new Date(2026, 9, 8, 1)), now)).toBe(5);
  });

  test('keeps the streak when the last entry was yesterday', () => {
    expect(getCurrentStreak(statsWith(new Date(2026, 9, 7, 23)), now)).toBe(5);
  });

  test('drops to 0 after a missed day', () => {
    expect(getCurrentStreak(statsWith(new Date(2026, 9, 5, 9)), now)).toBe(0);
  });

  test('is 0 when nothing has been written', () => {
    expect(getCurrentStreak(statsWith(null, 3), now)).toBe(0);
  });
});

describe('removeEntryFromStats', () => {
  const stats = {
    totalEntries: 2,
    tags: {
      work: { files: ['a.json', 'b.json'] },
      baby: { files: ['b.json'] },
    },
    moods: {
      '😌 peaceful': { dates: ['10-07-2026-0900', '10-08-2026-0100'], files: ['a.json', 'b.json'] },
      '😴 tired': { dates: ['10-08-2026-0100'], files: ['b.json'] },
    },
  };

  test('removes the file from tags and moods and drops empty ones', () => {
    const result = removeEntryFromStats(stats, 'b.json');
    expect(result.tags).toEqual({ work: { files: ['a.json'] } });
    expect(result.moods).toEqual({
      '😌 peaceful': { dates: ['10-07-2026-0900'], files: ['a.json'] },
    });
    expect(result.totalEntries).toBe(2);
  });

  test('does not mutate the original stats', () => {
    removeEntryFromStats(stats, 'b.json');
    expect(stats.tags.baby.files).toEqual(['b.json']);
  });
});

describe('shouldResetCounter', () => {
  const now = new Date(2026, 9, 8, 12);

  test('daily resets on a new day', () => {
    expect(shouldResetCounter('daily', new Date(2026, 9, 7, 12), now)).toBe(true);
  });

  test('monthly resets in a new month', () => {
    expect(shouldResetCounter('monthly', new Date(2026, 8, 30), now)).toBe(true);
    expect(shouldResetCounter('monthly', new Date(2026, 9, 1), now)).toBe(false);
  });
});

describe('countWords', () => {
  test('blank input is 0 words', () => {
    expect(countWords('   ')).toBe(0);
  });

  test('counts words across spaces and newlines', () => {
    expect(countWords(' one  two\nthree ')).toBe(3);
  });
});
