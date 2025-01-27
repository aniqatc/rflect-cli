#!/usr/bin/env node

/*
Fake Editor Simulation for CLI Testing

Purpose:
- Mimics a real text editor (like VSCode or Vim) in our test environment
- Automatically writes test content to avoid manual interaction
- Helps validate the CLI's editor integration

Key Behaviors:
1. Accepts a file path from the CLI tool (via command line argument)
2. Writes structured test content to that file
3. Simulates realistic exit codes and timing

Why We Need This:
- Testing the terminal functions will require opening a GUI editor
- CI/CD pipelines can't open GUI editors
- Ensures consistent test content across runs
*/

const fs = require('fs');
const filePath = process.argv[2]; // Get target file from CLI argument

// Safety check - CLI should always provide a file path
if (!filePath) {
  console.error('Error: Missing target file path');
  process.exit(1); // Standard error code for invalid arguments
}

try {
  // Simulate real editor behavior with a small delay
  setTimeout(() => {
    // Generate test content with unique identifiers
    const testContent = `
    [TEST REFLECTION] 
    Date: ${new Date().toISOString()}
    Status: Validation testing in progress
    Unique ID: ${Math.random().toString(36).substr(2, 6)}
    
    This is auto-generated content from the fake editor.
    Used to verify the CLI's editor integration works properly.
    `;

    // Preserve any existing content (like a real editor would)
    const existingContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf8')
      : '';

    // Write combined content to target file
    fs.writeFileSync(filePath, `${existingContent}\n${testContent}`, 'utf8');
    
    // Simulate successful editor exit
    process.exit(0); // 0 = success code
  }, 150); // Small delay to mimic editor launch time
} catch (err) {
  console.error(`Editor Error: ${err.message}`);
  process.exit(2); // 2 = file operation error
}