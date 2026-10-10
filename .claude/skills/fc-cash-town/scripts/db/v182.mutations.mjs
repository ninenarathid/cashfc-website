import { createHash } from 'node:crypto';
const md5=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
const guarded=mutate=>source=>{
 let broken=mutate(source);
 for(const m of source.matchAll(/CREATE OR REPLACE FUNCTION [\s\S]*?\$function\$\s*;/g)){
  const head=m[0].slice(0,m[0].indexOf('\n'));
  const other=[...broken.matchAll(/CREATE OR REPLACE FUNCTION [\s\S]*?\$function\$\s*;/g)].find(n=>n[0].startsWith(head));
  if(other&&other[0]!==m[0])broken=broken.replace(md5(m[0].slice(0,-1).trimEnd()+'\n'),md5(other[0].slice(0,-1).trimEnd()+'\n'));
 }
 return broken;
};
export default ({swap})=>[
 ['fish appear in every habitat',swap("not (coalesce(f->'habitat', '[\"town\"]'::jsonb) ? p_habitat)","false"),['town odds unchanged:'] ],
 ['current no longer changes fish',swap("(f ? 'current' and not (f->'current' ? p_current))","false"),['creek/eddy/corn/7:'] ],
 ['repeated casts leave rare fish unaffected',swap("then 0.5 else 1 end weight_","then 1 else 1 end weight_"),['repeated bait weights match game'] ],
 ['invalid current charged as a valid cast',guarded(swap("if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then","if false then")),['invalid current is refused','invalid current does not spend bait'] ],
 ['private regional helper exposed',swap('from public,anon,authenticated;','from anon,authenticated; grant usage on schema town to anon,authenticated; grant execute on function town.river_odds(text,integer,boolean,boolean,boolean,text[],double precision,text,text) to public;'),['regional helper ACL stays private'] ],
];
