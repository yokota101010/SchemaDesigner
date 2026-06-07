import fs from 'fs';
import { getDependencyLevels } from '../src/utils/aiDataGenerator.js';

const project = JSON.parse(fs.readFileSync('./models/sample1/Tutorial_Project_(Composite_Key_Demo)_schema.json', 'utf8'));

const levels = getDependencyLevels(project.tables, project.relationships);

console.log("=== Dependency Levels ===");
levels.forEach((level, idx) => {
    console.log(`Level ${idx}:`);
    level.forEach(t => {
        console.log(` - ${t.name} (ID: ${t.id})`);
    });
});
