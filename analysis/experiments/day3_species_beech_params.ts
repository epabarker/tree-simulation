/** Exact shipping-current beech inputs; resolves params without running a season. */
import {writeFileSync} from 'node:fs';
import {standParams,loneParams} from '../../cli/trials.ts';
import {speciesParams} from '../../src/core/params.ts';
const [out]=process.argv.slice(2);
const worlds=Array.from({length:20},(_,k)=>standParams('beech',21001+k));
const effective=speciesParams(worlds[0],'beech');
writeFileSync(out,JSON.stringify({worlds,effective,lone:loneParams('beech',21001)},null,1)+'\n');
