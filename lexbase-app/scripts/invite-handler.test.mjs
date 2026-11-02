import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInviteHandler} from '../../supabase/functions/invite-user/handler.ts';

const office='10000000-0000-0000-0000-000000000001';
const target={id:'target-fixture',email:'person@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z'};
const input={email:target.email,ad:'Fixture Person',rol:'avukat',buro_id:office};
function fixture(options={}){
  const calls=[],writes=[],invites=[],emails=[];
  const directory=options.users?[...options.users]:[];
  const memberships=[...(options.noAuthority?[]:[{id:'owner-member',auth_id:'actor-fixture',buro_id:office,rol:options.actorRole||'sahip',durum:'aktif'}]),
    ...(options.membership?[{id:'target-member',auth_id:target.id,buro_id:office,rol:'avukat',...options.membership}]:[])];
  const profiles=[];
  function matches(row,filters){return filters.every(([op,key,value])=>op==='eq'?row[key]===value:value.includes(row[key]));}
  function execute(q){
    calls.push({table:q.table,action:q.action,filters:q.filters,payload:q.payload});
    if(q.action==='read'){
      if(q.table==='burolar')return {data:options.failBuro?null:{ad:options.buroName||'Fixture Office'},error:options.failBuro?{code:'denied'}:null};
      assert.equal(q.table,'uyelikler');
      if(options.failMembershipRead&&q.filters.some(([,key,value])=>key==='auth_id'&&value===target.id))return {data:null,error:{code:'backend'}};
      if(options.failAuthority&&q.filters.some(([,key,value])=>key==='auth_id'&&value==='actor-fixture'))return {data:null,error:{code:'backend'}};
      const rows=memberships.filter(row=>matches(row,q.filters)).slice(0,q.count??Infinity);
      return {data:q.one?rows[0]??null:rows,error:null};
    }
    if(q.table==='kullanicilar'){
      if(options.failProfile)return {data:null,error:{code:'profile_error'}};
      profiles.push({...q.payload});writes.push({table:q.table,payload:{...q.payload}});
      return {data:options.unconfirmedProfile?null:{auth_id:q.payload.auth_id},error:null};
    }
    if(q.table==='uyelikler'){
      if(q.action==='update'){
        const row=memberships.find(row=>matches(row,q.filters));
        if(options.failReactivation||!row)return {data:null,error:{code:'PGRST116'}};
        Object.assign(row,q.payload);writes.push({table:q.table,payload:{...q.payload}});
        return {data:options.unconfirmedReactivation?null:{id:row.id},error:null};
      }
      if(options.failMemberInsert)return {data:null,error:{code:'membership_error'}};
      const row={id:`member-${memberships.length}`,...q.payload};
      memberships.push(row);writes.push({table:q.table,payload:{...q.payload}});
      return {data:options.unconfirmedMembership?null:{id:row.id},error:null};
    }
    assert.equal(q.table,'bildirimler');
    if(options.failNotification)return {data:null,error:{code:'notification_error'}};
    writes.push({table:q.table,payload:{...q.payload}});
    return {data:{id:'notification-fixture'},error:null};
  }
  const admin={from(table){
    const q={table,action:'read',filters:[],payload:null,
      select(){return q;},eq(key,value){q.filters.push(['eq',key,value]);return q;},
      in(key,value){q.filters.push(['in',key,value]);return q;},limit(count){q.count=count;return q;},
      single(){q.one=true;return Promise.resolve(execute(q));},maybeSingle(){q.one=true;return Promise.resolve(execute(q));},
      insert(payload){q.action='insert';q.payload=payload;return q;},upsert(payload){q.action='upsert';q.payload=payload;return q;},
      update(payload){q.action='update';q.payload=payload;return q;},
      then(resolve,reject){return Promise.resolve().then(()=>execute(q)).then(resolve,reject);}};
    return q;
  },auth:{admin:{
    async listUsers({page,perPage}){
      calls.push({action:'listUsers',page,perPage});
      if(options.failDirectory)return {data:null,error:{code:'directory_error'}};
      if(options.directoryLimit)return {data:{users:Array.from({length:perPage},()=>({email:'other@example.invalid'}))},error:null};
      return {data:{users:directory.slice((page-1)*perPage,page*perPage)},error:null};
    },
    async inviteUserByEmail(email,config){
      invites.push({email,config});
      if(options.failInvite)return {data:{user:null},error:{message:'Fixture provider failure'}};
      const user=options.inviteUser===undefined?{id:'new-fixture',email,email_confirmed_at:null}:options.inviteUser;
      if(user?.id)directory.push(user);
      return {data:{user},error:null};
    }
  }}};
  const environment={SUPABASE_URL:'https://fixture.supabase.invalid',SUPABASE_ANON_KEY:'fixture-public',
    SUPABASE_SERVICE_ROLE_KEY:'fixture-server',PUBLIC_APP_URL:'https://lexbase.app',
    ...(options.resend?{RESEND_API_KEY:'fixture-email'}:{}),...options.env};
  const handler=createInviteHandler({env:name=>environment[name],
    createClient(_url,key,config){
      calls.push({action:'createClient',key,config});
      if(key==='fixture-public')return {auth:{async getUser(){return {data:{user:options.invalidSession?null:
        {id:'actor-fixture',email:'owner@example.invalid',user_metadata:{ad:options.callerName||'Fixture Owner'}}},error:options.authError?{code:'invalid'}:null};}}};
      assert.equal(key,'fixture-server');return admin;
    },
    async fetch(url,config){
      assert.equal(url,'https://api.resend.com/emails');emails.push(JSON.parse(config.body));
      if(options.emailThrows)throw new Error('Fixture mail unavailable');
      return new Response('',{status:options.emailFailure?429:200});
    }});
  async function request(body=input,{method='POST',authorization=true,raw=false}={}){
    const headers={'Content-Type':'application/json',...(authorization?{Authorization:'Bearer fixture-token'}:{})};
    const response=await handler(new Request('https://fixture.invalid/invite-user',{method,headers,
      ...(['GET','OPTIONS'].includes(method)?{}:{body:raw?body:JSON.stringify(body)})}));
    return {status:response.status,headers:response.headers,body:method==='OPTIONS'?null:await response.json()};
  }
  return {request,calls,writes,invites,emails,memberships,profiles};
}

test('invite handler handles preflight/method/auth rejection before any write',async()=>{
  const f=fixture();assert.equal((await f.request(null,{method:'OPTIONS'})).status,200);
  assert.equal((await f.request(null,{method:'GET'})).status,405);
  assert.equal((await f.request(input,{authorization:false})).status,401);
  assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);assert.equal(f.invites.length,0);
});
test('invalid session or incomplete server config never reaches privileged operations',async()=>{
  for(const options of [{invalidSession:true},{authError:true}]){
    const f=fixture(options);assert.equal((await f.request()).status,401);assert.equal(f.calls.length,1);assert.equal(f.writes.length,0);
  }
  const f=fixture({env:{SUPABASE_SERVICE_ROLE_KEY:undefined}});assert.equal((await f.request()).status,503);assert.equal(f.calls.length,0);
});
test('malformed invite input does not reach membership or directory lookup',async()=>{
  for(const body of [null,[],{}, {...input,email:'bad'}, {...input,ad:''}]){
    const f=fixture();assert.equal((await f.request(body)).status,400);assert.equal(f.writes.length,0);assert.equal(f.invites.length,0);
  }
  assert.equal((await fixture().request('{bad',{raw:true})).status,400);
});
test('unauthorized bureau and manager role escalation cannot call Auth invitations',async()=>{
  for(const [options,body,status] of [[{noAuthority:true},input,403],[{failAuthority:true},input,503],
    [{actorRole:'yonetici'},{...input,rol:'sahip'},403],[{}, {...input,buro_id:'10000000-0000-0000-0000-000000000002'},403]]){
    const f=fixture(options);assert.equal((await f.request(body)).status,status);assert.equal(f.invites.length,0);assert.equal(f.writes.length,0);
  }
});
test('bureau, Auth directory and membership read failures fail closed',async()=>{
  for(const options of [{failBuro:true},{failDirectory:true},{users:[target],failMembershipRead:true}]){
    const f=fixture(options);assert.equal((await f.request()).status,503);assert.equal(f.writes.length,0);assert.equal(f.invites.length,0);
  }
});
test('directory pagination finds existing target after first page without sending a duplicate invite',async()=>{
  const f=fixture({users:[...Array.from({length:200},(_,i)=>({id:`other-${i}`,email:`other-${i}@example.invalid`})),target]});
  const result=await f.request();assert.equal(result.body.status,'existing_user_added');assert.equal(f.invites.length,0);
  assert.deepEqual(f.calls.filter(x=>x.action==='listUsers').map(x=>x.page),[1,2]);
});
test('bounded directory lookup does not misclassify an uncertain target as a new user',async()=>{
  const f=fixture({directoryLimit:true});assert.equal((await f.request()).status,503);
  assert.equal(f.calls.filter(x=>x.action==='listUsers').length,100);assert.equal(f.invites.length,0);assert.equal(f.writes.length,0);
});
test('existing confirmed user joins only selected bureau; profile is not overwritten and retry is idempotent',async()=>{
  const f=fixture({users:[target]});const first=await f.request();
  assert.equal(first.body.status,'existing_user_added');
  assert.deepEqual(f.writes.find(x=>x.table==='uyelikler').payload,{auth_id:target.id,buro_id:office,rol:'avukat',durum:'aktif'});
  assert.equal(f.profiles.length,0);assert.equal((await f.request()).body.status,'already_member');
  assert.equal(f.writes.filter(x=>x.table==='uyelikler').length,1);
});
test('unconfirmed existing account cannot gain active membership through an invite retry',async()=>{
  const f=fixture({users:[{...target,email_confirmed_at:null}]});assert.equal((await f.request()).status,409);
  assert.equal(f.writes.length,0);assert.equal(f.invites.length,0);
});
test('already-pending membership remains pending and is not silently reactivated or re-emailed',async()=>{
  const f=fixture({users:[target],membership:{durum:'davet_gonderildi'}});const result=await f.request();
  assert.equal(result.body.status,'invited');assert.equal(result.body.pending_existing,true);
  assert.equal(f.writes.length,0);assert.equal(f.invites.length,0);
});
test('unknown membership state does not masquerade as already-active',async()=>{
  const f=fixture({users:[target],membership:{durum:'unexpected'}});assert.equal((await f.request()).status,409);assert.equal(f.writes.length,0);
});
test('reactivation confirms a row and keeps bureau/status/prior-role compare-and-set filters',async()=>{
  const f=fixture({users:[target],membership:{durum:'pasif'}});assert.equal((await f.request()).body.status,'reactivated');
  const update=f.calls.find(x=>x.action==='update');
  assert.deepEqual(update.filters,[['eq','id','target-member'],['eq','buro_id',office],['eq','durum','pasif'],['eq','rol','avukat']]);
  assert.equal((await f.request()).body.status,'already_member');
});
test('failed or unconfirmed reactivation cannot report success or send notifications',async()=>{
  for(const options of [{failReactivation:true},{unconfirmedReactivation:true}]){
    const f=fixture({users:[target],membership:{durum:'pasif'},...options});assert.equal((await f.request()).status,503);
    assert.equal(f.writes.some(x=>x.table==='bildirimler'),false);
  }
});
test('manager cannot reactivate an existing owner even when requested role is nonprivileged',async()=>{
  const f=fixture({actorRole:'yonetici',users:[target],membership:{durum:'pasif',rol:'sahip'}});
  assert.equal((await f.request()).status,403);assert.equal(f.writes.length,0);
});
test('failed or unconfirmed existing-user membership insertion never reports success',async()=>{
  for(const options of [{failMemberInsert:true},{unconfirmedMembership:true}]){
    const f=fixture({users:[target],...options});assert.equal((await f.request()).status,503);
    assert.equal(f.writes.some(x=>x.table==='bildirimler'),false);
  }
});
test('new invitation uses configured application origin and consistent profile bureau fields',async()=>{
  const f=fixture();const result=await f.request({...input,email:' PERSON@example.invalid '});
  assert.equal(result.status,200);assert.equal(result.body.status,'invited');
  assert.equal(f.invites[0].config.redirectTo,'https://lexbase.app/auth/callback?next=/dashboard');
  assert.equal(f.invites[0].email,target.email);
  assert.deepEqual(f.profiles[0],{auth_id:'new-fixture',buro_id:office,firm_id:office,email:target.email,ad:input.ad,rol:'avukat'});
  assert.equal(f.memberships.find(x=>x.auth_id==='new-fixture').durum,'davet_gonderildi');
});
test('missing app origin defers to Auth Site URL instead of deriving a Supabase application host',async()=>{
  const f=fixture({env:{PUBLIC_APP_URL:undefined}});await f.request();assert.equal(Object.hasOwn(f.invites[0].config,'redirectTo'),false);
});
test('unsafe configured redirect origin fails before email or database writes',async()=>{
  for(const origin of ['not a URL','javascript:alert(1)','https://user:secret@lexbase.app','http://lexbase.app']){
    const f=fixture({env:{PUBLIC_APP_URL:origin}});assert.equal((await f.request()).status,503);assert.equal(f.invites.length,0);assert.equal(f.writes.length,0);
  }
});
test('provider invite failure never writes profile or membership',async()=>{
  const f=fixture({failInvite:true});assert.equal((await f.request()).status,500);assert.equal(f.writes.length,0);
});
test('missing or mismatched invited user is reported as incomplete setup, not success',async()=>{
  for(const user of [null,{id:'wrong-user',email:'different@example.invalid'}]){
    const f=fixture({inviteUser:user});const result=await f.request();assert.equal(result.status,503);
    assert.equal(result.body.status,'invite_setup_incomplete');assert.equal(result.body.email_sent,true);assert.equal(f.writes.length,0);
  }
});
test('profile or pending-membership setup failure stays explicit; retry cannot promote the unconfirmed user',async()=>{
  for(const options of [{failProfile:true},{unconfirmedProfile:true},{failMemberInsert:true},{unconfirmedMembership:true}]){
    const f=fixture(options);const first=await f.request();assert.equal(first.status,503);assert.equal(first.body.status,'invite_setup_incomplete');
    const retry=await f.request();assert.ok([200,409].includes(retry.status));
    if(retry.status===200){assert.equal(retry.body.status,'invited');assert.equal(retry.body.pending_existing,true);}
    assert.equal(f.invites.length,1);assert.equal(f.memberships.some(x=>x.auth_id==='new-fixture'&&x.durum==='aktif'),false);
  }
});
test('secondary notification/email failures preserve saved membership and report warnings rather than duplicate it',async()=>{
  const f=fixture({users:[target],resend:true,failNotification:true,emailFailure:true});const result=await f.request();
  assert.equal(result.status,200);assert.equal(result.body.status,'existing_user_added');
  assert.deepEqual(result.body.warnings,['notification_failed','email_failed']);
  assert.match(result.body.message,/Uyelik kaydedildi/);assert.equal((await f.request()).body.status,'already_member');
  assert.equal(f.writes.filter(x=>x.table==='uyelikler').length,1);
});
test('email transport exceptions are nonfatal to a confirmed membership write',async()=>{
  const f=fixture({users:[target],resend:true,emailThrows:true});const result=await f.request();assert.equal(result.status,200);
  assert.deepEqual(result.body.warnings,['email_failed']);
});
test('email HTML escapes display names and metadata while address stays unchanged',async()=>{
  const f=fixture({users:[target],resend:true,callerName:'<img src=x>',buroName:'<script>bad</script>'});
  await f.request({...input,ad:'<b>Person</b>'});assert.equal(f.emails.length,1);
  assert.doesNotMatch(f.emails[0].html,/<script>|<img src=x>|<b>Person<\/b>/);
  assert.match(f.emails[0].html,/&lt;b&gt;Person&lt;\/b&gt;/);assert.deepEqual(f.emails[0].to,[target.email]);
});
