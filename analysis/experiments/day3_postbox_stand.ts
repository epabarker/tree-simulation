/** Existing standard species stand trial, retained outcome hash (not a core state hash). */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runStand} from '../../cli/trials.ts';
const [name,seedText,out]=process.argv.slice(2),seed=Number(seedText);
const candidate=JSON.parse(readFileSync('analysis/experiments/day3_postbox_candidates.json','utf8')).find(c=>c.name===name);
if(!candidate||!Number.isInteger(seed))throw Error('unknown candidate/seed');
const start=performance.now(),traits=runStand(name,seed,candidate.assign,150);
writeFileSync(out,JSON.stringify({name,seed,traits,traits_sha256:createHash('sha256').update(JSON.stringify(traits)).digest('hex'),elapsedMs:performance.now()-start})+'\n');
