const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const styles = require('./styles');

const configLocation = () => path.join(os.homedir(), '.rflect', 'config.json');

async function readConfig() {
  const configFile = await fs.readFile(configLocation(), 'utf8');
  return JSON.parse(configFile);
}

async function checkConfig() {
  let config;
  try {
    config = await readConfig();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // Config exists but can't be read or parsed; surface it instead of crashing later
      throw new Error(`Could not read ${configLocation()}: ${error.message}`);
    }
    // Setup never ran (e.g. installed with --ignore-scripts), so create it now
    const createRflectDirectory = require('../scripts/install');
    const created = await createRflectDirectory(false, { quiet: true });
    if (!created) {
      throw new Error('Could not create the rflect directory. Try running rflect config --install');
    }
    config = await readConfig();
  }

  // Presence of name indicates user has run init command before
  const isFirstTime = !config.user || !config.user.name || !config.user.name.trim();
  return { isFirstTime, config };
}

async function updateConfig(config) {
  try {
    await fs.writeFile(configLocation(), JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(styles.error('Error updating configuration: ') + styles.value(error.message));
  }
}

module.exports = { checkConfig, updateConfig };
