const fs = require('node:fs');
fs.mkdirSync('dist/db', { recursive: true });
fs.copyFileSync('src/db/schema.sql', 'dist/db/schema.sql');
