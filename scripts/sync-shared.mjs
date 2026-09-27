// Copies the shared course data and statistics code into the Cloud Functions package before deploy.
import { mkdirSync, copyFileSync } from 'node:fs';
mkdirSync('functions/shared', { recursive: true });
for (const f of ['src/lib/stats.js', 'src/data/course.js', 'src/data/rubrics.js']) copyFileSync(f, 'functions/shared/' + f.split('/').pop());
console.log('shared files synced');
