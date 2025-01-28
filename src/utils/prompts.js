const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const promptLocation = path.join(os.homedir(), '.rflect', 'prompts.json');

async function getAllPrompts() {
  try {
    const data = await fs.readFile(promptLocation, 'utf8');
    const prompts = JSON.parse(data);
    return prompts.map((prompt) => prompt.question);
  } catch (error) {
    throw new Error('Failed to retrieve prompts. Please check the prompts file.');
  }
}

async function getPromptsByCategory(category) {
  try {
    const data = await fs.readFile(promptLocation, 'utf8');
    const prompts = JSON.parse(data);
    return prompts
      .filter((prompt) => prompt.category === category)
      .map((prompt) => prompt.question);
  } catch (error) {
    throw new Error('Failed to retrieve prompts by category. Please check the prompts file.');
  }
}

async function getRandomPrompt() {
  try {
    const data = await fs.readFile(promptLocation, 'utf8');
    const prompts = JSON.parse(data);
    const unusedPrompts = prompts.filter((prompt) => prompt.usageCount === 0); // prioritize unused
    const selectedPrompts = unusedPrompts.length > 0 ? unusedPrompts : prompts; // if all have been used at least once, just pick from prompts at random
    return selectedPrompts[Math.floor(Math.random() * selectedPrompts.length)];
  } catch (error) {
    throw new Error('Failed to retrieve a random prompt. Please check the prompts file.');
  }
}

async function incrementPromptUsageCount(id) {
  try {
    const data = await fs.readFile(promptLocation, 'utf8');
    const prompts = JSON.parse(data);
    prompts[prompts.findIndex((prompt) => prompt.id === id)].usageCount++;
    await fs.writeFile(promptLocation, JSON.stringify(prompts, null, 2));
  } catch (error) {
    throw new Error('Failed to update prompt usage count. Please check the prompts file.');
  }
}

module.exports = {
  incrementPromptUsageCount,
  getAllPrompts,
  getPromptsByCategory,
  getRandomPrompt,
};
