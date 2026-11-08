/** Candidate-only species through the existing trial/assignment pipeline; no FLORA mutation. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {FLORA} from '../../src/core/flora.ts';
import {clone,speciesParams} from '../../src/core/params.ts';
import {loneParams,standParams,withAssign} from '../../cli/trials.ts';
import {forestParams} from '../../src/core/presets.ts';
const [out]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const targets=JSON.parse(readFileSync('analysis/fit/sources/day3-postbox-tallo.json','utf8'));
const records=[];
for(const [name,latin,leaf,seedStart] of [['sycamore','Acer pseudoplatanus','maple',22001],['ash','Fraxinus excelsior','rowan',23001]] as const){
 const parent=clone(FLORA.maple) as Record<string,any>;delete parent.common;delete parent.latin;delete parent.leaf;
 parent.r1={...parent.r1,fRep:.8,maturity:targets.species[name].initial_maturity_cells};
 const patch={...parent,common:name==='ash'?'Ash':'Sycamore',latin,leaf};
 const lone=withAssign(loneParams(name,seedStart),name,parent),stand=withAssign(standParams(name,seedStart),name,parent);
 const garden=withAssign(forestParams(160,seedStart),name,parent);
 const dir=join(out,name);mkdirSync(dir,{recursive:true});
 for(const [key,params] of [['lone',lone],['stand',stand],['garden',garden]] as const)writeFileSync(join(dir,key+'.json'),JSON.stringify(params,null,1)+'\n');
 writeFileSync(join(dir,'patch.json'),JSON.stringify({[name]:parent},null,1)+'\n');
 records.push({name,latin,leaf,prior:'current field maple generic opposite-branching starting prior; not a relabel',assign:parent,patch,effectiveLone:speciesParams(lone,name),effectiveStand:speciesParams(stand,name),trainingSeeds:Array.from({length:20},(_,k)=>seedStart+k),confirmationSeeds:Array.from({length:20},(_,k)=>seedStart+20+k)});
}
writeFileSync(join(out,'candidates.json'),JSON.stringify(records,null,1)+'\n');
