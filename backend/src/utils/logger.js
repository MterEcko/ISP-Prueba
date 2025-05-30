// Logger simple para el sistema
const log = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  },
  error: (message) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  },
  debug: (message) => {
    console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
  }
};

module.exports = log;