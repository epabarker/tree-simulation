/** Retained lone allometry/skeletons from the existing Rust core; no fitted logic. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {newWorld} from '../../cli/trials.ts';
import {allometry} from '../../cli/allometry.ts';
const [input,out]=process.argv.slice(2),params=JSON.parse(readFileSync(input,'utf8'));
if(params.trees.length!==1||params.o4.enabled||params.world.sides==='periodic'||params.world.sidesZ==='periodic')throw Error('expected one open-grown non-recruiting tree');
mkdirSync(out,{recursive:true});const start=performance.now(),world=newWorld(params),sizes=[],dumps:Record<string,string>={};
const columns=['parent','slot','order','axis','baseX','baseY','baseZ','hx','hy','hz','length','radius','stressWood'] as const;
for(let season=50;season<=150;season+=10){
 world.run(season-world.season);const t=world.trees[0];
 sizes.push({season,trees:[t.alive?{tree:0,alive:true,...allometry(t.m.cols,t.b.cols)}:{tree:0,alive:false}]});
 if(season<=100){const effective=world.paramsOf(t);const record={species:t.species,seed:params.seed,trial:'lone',season,index:0,alive:t.alive,r6:{enabled:effective.r6.enabled,leafArea:effective.r6.leafArea},m:Object.fromEntries(columns.map(k=>[k,Array.from(t.m.cols[k])])),b:{metamer:Array.from(t.b.cols.metamer),state:Array.from(t.b.cols.state)},form:{},profile:[]};
 const path=join(out,`s${params.seed}-${season}.json`);writeFileSync(path,JSON.stringify({trees:[record]})+'\n');dumps[season]=path;}
}
writeFileSync(join(out,'result.json'),JSON.stringify({seed:params.seed,allometry:sizes,dumps,hash:world.hash(),elapsedMs:performance.now()-start})+'\n');world.dispose();
