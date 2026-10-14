type InviteRole = 'sahip' | 'yonetici' | 'avukat' | 'stajyer' | 'sekreter';
interface Membership { buro_id: string; rol: 'sahip' | 'yonetici' }
interface MembershipQuery extends PromiseLike<{
  data: Membership[] | null; error: unknown;
}> {
  select(fields: string): MembershipQuery;
  eq(field: string, value: string): MembershipQuery;
  in(field: string, values: string[]): MembershipQuery;
  limit(count: number): MembershipQuery;
}
interface AdminClient { from(table: string): MembershipQuery }

export class InviteAuthorizationError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status=status; }
}

export function authorizeReactivation(callerRole: string, existingRole: unknown) {
  if (!['sahip','yonetici'].includes(callerRole)) {
    throw new InviteAuthorizationError('Ekip yonetimi yetkisi gerekli.',403);
  }
  if (typeof existingRole !== 'string' || !['sahip','yonetici','avukat','stajyer','sekreter'].includes(existingRole)) {
    throw new InviteAuthorizationError('Mevcut uyelik rolu dogrulanamadi.',503);
  }
  if (callerRole !== 'sahip' && ['sahip','yonetici'].includes(existingRole)) {
    throw new InviteAuthorizationError('Yetkili ekip uyeligini yalniz buro sahibi yeniden etkinlestirebilir.',403);
  }
}

export async function authorizeInvite(client: AdminClient, actorId: string,
  requestedBuro: unknown, requestedRole: unknown) {
  const role = requestedRole ?? 'avukat';
  if (typeof role !== 'string' || !['sahip','yonetici','avukat','stajyer','sekreter'].includes(role)) {
    throw new InviteAuthorizationError('Gecersiz davet rolu.',400);
  }
  if (requestedBuro !== undefined && (typeof requestedBuro !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedBuro))) {
    throw new InviteAuthorizationError('Gecerli buro secimi gerekli.',400);
  }
  if (!actorId) throw new InviteAuthorizationError('Oturum gerekli.',401);
  let query=client.from('uyelikler').select('buro_id, rol')
    .eq('auth_id',actorId).eq('durum','aktif').in('rol',['sahip','yonetici']);
  if (typeof requestedBuro === 'string') query=query.eq('buro_id',requestedBuro);
  const {data,error}=await query.limit(2);
  if (error) throw new InviteAuthorizationError('Davet yetkisi dogrulanamadi. Kayit yapilmadi.',503);
  if (!data?.length) throw new InviteAuthorizationError('Bu buroda aktif ekip yonetimi yetkiniz yok.',403);
  if (data.length !== 1) throw new InviteAuthorizationError('Davet icin buro secimini belirtin.',400);
  const membership=data[0];
  if (!membership.buro_id || !['sahip','yonetici'].includes(membership.rol)
    || (requestedBuro !== undefined && membership.buro_id !== requestedBuro)) {
    throw new InviteAuthorizationError('Davet yetkisi dogrulanamadi.',403);
  }
  if (membership.rol !== 'sahip' && ['sahip','yonetici'].includes(role)) {
    throw new InviteAuthorizationError('Yetkili ekip rollerini yalniz buro sahibi atayabilir.',403);
  }
  return {buroId:membership.buro_id,callerRole:membership.rol,role:role as InviteRole};
}
