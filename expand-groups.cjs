// Script to expand 8 groups to 32 groups in BatchDailyTasks.vue

const fs = require('fs');
const path = 'src/views/BatchDailyTasks.vue';

let content = fs.readFileSync(path, 'utf-8');

// Generate options for 1-32
const options = [];
for (let i = 1; i <= 32; i++) {
  options.push(`{ label: '第${i}组', value: ${i} }`);
}

const newOptionsStr = '[' + options.join(', ') + ']';

// Find and replace the selectedApexGroupId options
const pattern = /:options="\[{ label: '第 \d+ 组', value: \d+ },.*?value: 8 }\]"/s;
if (pattern.test(content)) {
  content = content.replace(pattern, ':options="' + newOptionsStr + '"');
  fs.writeFileSync(path, content, 'utf-8');
  console.log('✓ Updated from 8 groups to 32 groups');
} else {
  console.log('❌ Pattern not found, trying alternative approach');
  
  // Alternative: find line with "selectedApexGroupId" and replace after it
  const lines = content.split('\n');
  const newLines = [];
  let replaced = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('v-model:value="selectedApexGroupId"') && !replaced) {
      newLines.push(lines[i]);
      // Check next line
      if (i + 1 < lines.length && lines[i + 1].includes(':options=')) {
        newLines.push(':options="' + newOptionsStr + '"');
        replaced = true;
        console.log('✓ Updated selectedApexGroupId options to 32 groups');
        continue;
      }
    }
    newLines.push(lines[i]);
  }
  
  if (!replaced) {
    console.log('❌ Could not find target location');
    process.exit(1);
  }
  
  fs.writeFileSync(path, newLines.join('\n'), 'utf-8');
}
