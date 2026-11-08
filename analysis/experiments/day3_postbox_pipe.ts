/** Controlled allocation/pipe stand probes using unchanged existing species trial. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {standParams,withAssign,runStand} from '../../cli/trials.ts';
const [mode,out,species,condition,seedText]=process.argv.slice(2);
const variants=JSON.parse(readFileSync('analysis/experiments/day3_postbox_pipe.json','utf8'));
if(mode==='prepare'){
 for(const v of variants){const dir=join(out,v.species,v.condition);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'patch.json'),JSON.stringify({[v.species]:v.assign},null,1)+'\n');
 for(const seed of v.seeds)writeFileSync(join(dir,`s${seed}.params.json`),JSON.stringify(withAssign(standParams(v.species,seed),v.species,v.assign))+'\n');}
}else if(mode==='run'){
 const v=variants.find(v=>v.species===species&&v.condition===condition),seed=Number(seedText);if(!v||!v.seeds.includes(seed))throw Error('unregistered probe');
 const start=performance.now(),traits=runStand(species,seed,v.assign,150);writeFileSync(out,JSON.stringify({species,condition,seed,traits,traits_sha256:createHash('sha256').update(JSON.stringify(traits)).digest('hex'),elapsedMs:performance.now()-start})+'\n');
}else throw Error('prepare|run required');
