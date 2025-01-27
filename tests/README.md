# Testing Documentation 🧪

### **First-Time Setup**

```bash
# Make the fake editor executable (only needed once)
chmod +x tests/helpers/fakeEditor.js
```

### Basic Test Commands

```bash
# Run all tests
npm run test

# Run only the write command tests
npm run test:write

# Nuclear option for when tests get weird
npx jest --clearCache	
```

### Debugging Helpers 🐛

```bash
# See detailed execution flow
npm run test -- --inspect

# Hunt for zombie processes
npm run test:write -- --detectOpenHandles

# Manual editor debugging
EDITOR="node ./tests/helpers/fake-editor.js" node --inspect ./src/commands/write.js
```

### When Tests Fail... 😱

```bash
# 1. Check Permissions (you are looking for a '+' in the first column)
ls -l tests/helpers/fakeEditor.js

# 2. Node version
node -v # Should be 14+

# 3. Jest ghosts
npx jest --clearCache

# 4. Run the failing test in isolation
npm run test:write -- --detectOpenHandles --verbose
```
