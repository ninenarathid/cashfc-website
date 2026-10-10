// Run after next build. Dev-only rule engines must be eliminated from browser chunks.
import { readFileSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
const files=readdirSync('.next/static/chunks',{recursive:true}).filter(f=>f.endsWith('.js'));
if(!files.length)throw Error('No production chunks; run npm run build first');
const leaked=files.filter(f=>/SECRET_RULES|SC(?:01|02|03|11|13)\b|combo_rules|The otter remembers|A thread home/.test(readFileSync(join('.next/static/chunks',f),'utf8')));
if(leaked.length)throw Error('Private combo rules leaked: '+leaked.join(', '));
console.log(`Private combo registry absent from ${files.length} production browser chunks.`);
