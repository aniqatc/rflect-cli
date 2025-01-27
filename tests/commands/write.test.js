const { spawn } = require('child_process');
const path = require('path');

/**
 * Test Suite for Reflection Writing Command
 * 
 * Why a single test? We're simulating real user flow from start to finish.
 * Breaking this into separate tests would require restarting the CLI each time,
 * which loses state and doesn't match how users actually interact with the app.
 * 
 * The workflow has 3 main prompts:
 * 1. Mood Selection: User scrolls through options (↑/↓ arrows) to choose "peaceful"
 * 2. Editor Launch: After answering a random question, user presses Enter to open editor
 *    - Our fake editor immediately returns test content
 * 3. Tag Entry: Simple text input where we type "testing" and submit
 */

// TODO: check if the file was created and verify that the data inside matches the expected user selections

describe('Reflection writing workflow', () => {
  test('completes full user journey from mood selection to saving', (done) => {
    // Give this test plenty of time to complete
    jest.setTimeout(30000);

    // Set up our fake editor that immediately returns test content
    // This avoids opening a real text editor during testing
    const fakeEditorPath = path.resolve(__dirname, '../helpers/fakeEditor.js');

    // Start the CLI process
    const cli = spawn('node', ['./', 'write'], {
      env: {
        ...process.env,
        // Point to our fake editor script
        EDITOR: `node ${fakeEditorPath}`,
      },
    });

    let output = '';
    const promptTracker = {
      moodHandled: false,
      editorLaunched: false,
      tagsAdded: false,
      completionConfirmed: false
    };

    // Handle CLI output stream
    cli.stdout.on('data', (data) => {
      const rawOutput = data.toString();
      output += rawOutput;

      // --- Mood Selection ---
      // Simulates user pressing ↓ arrow + Enter to choose "peaceful"
      if (!promptTracker.moodHandled && rawOutput.includes('How are you feeling today?')) {
        cli.stdin.write('\x1B[B\r'); // Send arrow down + Enter
        promptTracker.moodHandled = true;
      }

      // --- Editor Launch ---
      // Simulates pressing Enter after question to launch editor
      if (!promptTracker.editorLaunched && rawOutput.includes('Press <enter> to launch')) {
        cli.stdin.write('\r'); // Send Enter key
        promptTracker.editorLaunched = true;
      }

      // --- Tag Entry ---
      // Simple text input where we type "testing" and submit
      if (!promptTracker.tagsAdded && rawOutput.includes('Add tags (comma-separated)')) {
        cli.stdin.write('testing\r'); // Type tags + Enter
        cli.stdin.end(); // Close input stream
        promptTracker.tagsAdded = true;
      }

      // --- Final Confirmation ---
      // Clean up when we see success message
      if (!promptTracker.completionConfirmed && rawOutput.includes('Your reflection has been saved')) {
        cli.stdout.destroy();
        cli.stderr.destroy();
        cli.kill(9); // Force exit
        promptTracker.completionConfirmed = true;
      }
    });

    // Handle any unexpected errors
    cli.stderr.on('data', (data) => {
      if (!cli.killed) {
        console.error('Unexpected error:', data.toString());
      }
    });

    // When process completes
    cli.on('close', (code) => {
      try {
        // Final verification of all steps
        console.log('\nTest Summary:');
        console.log('Mood selection:', promptTracker.moodHandled ? '✅' : '❌');
        console.log('Editor launch:', promptTracker.editorLaunched ? '✅' : '❌');
        console.log('Tags added:', promptTracker.tagsAdded ? '✅' : '❌');
        console.log('Completion:', promptTracker.completionConfirmed ? '✅' : '❌');

        // Check actual output contents
        expect(output).toContain('peaceful'); // Mood selection confirmation
        expect(output).toContain('Received'); // Fake editor content
        expect(output).toContain('testing'); // Tag confirmation
        expect(output).toMatch(/Reflection written successfully|Your reflection has been saved/);

        done();
      } catch (err) {
        console.log('\nFailed Output:\n' + output);
        done(err);
      }
    });
  });
});