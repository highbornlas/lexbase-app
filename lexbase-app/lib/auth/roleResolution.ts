export type Rol = 'sahip' | 'yonetici' | 'avukat' | 'stajyer' | 'sekreter';
export interface RoleState { rol: Rol | null; loading: boolean; error: string | null }
const ROLES: readonly string[] = ['sahip', 'yonetici', 'avukat', 'stajyer', 'sekreter'];
interface Result { data: { rol?: string; buro_id?: string } | null; error: unknown }
interface Query {
  select(columns: string): Query;
  eq(column: string, value: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  limit(count: number): Query;
  maybeSingle(): PromiseLike<Result>;
}
interface Client {
  from(table: string): Query;
  auth: {
    getUser(): PromiseLike<{ data: { user: { id: string } | null }; error: unknown }>;
    onAuthStateChange(callback: (event: string, session: { user: { id: string } } | null) => void):
      { data: { subscription: { unsubscribe(): void } } };
  };
}

async function verifiedRole(client: Client, userId: string, buroId: string | null): Promise<Rol> {
  let q = client.from('uyelikler').select('rol, buro_id').eq('auth_id', userId).eq('durum', 'aktif');
  q = buroId ? q.eq('buro_id', buroId) : q.order('created_at', { ascending: true }).limit(1);
  const membership = await q.maybeSingle();
  if (membership.error) throw new Error('Membership lookup failed');
  if (membership.data) {
    if (ROLES.includes(membership.data.rol || '')) return membership.data.rol as Rol;
    throw new Error('Unrecognized membership role');
  }
  let legacyQuery = client.from('kullanicilar').select('rol, buro_id').eq('auth_id', userId);
  if (buroId) legacyQuery = legacyQuery.eq('buro_id', buroId);
  const legacy = await legacyQuery.maybeSingle();
  if (!legacy.error && legacy.data?.buro_id && ROLES.includes(legacy.data.rol || '')) return legacy.data.rol as Rol;
  throw new Error('No verified role');
}

export function startRoleResolution(supabase: unknown, readBuroId: () => string | null,
  publish: (state: RoleState) => void, timeoutMs = 10000) {
  const client = supabase as Client;
  let generation = 0, disposed = false;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  function emit(state: RoleState) { if (!disposed) publish(state); }
  async function refresh(userId?: string) {
    const current = ++generation;
    emit({ rol: null, loading: true, error: null });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = async () => {
        let id = userId;
        if (!id) {
          const result = await client.auth.getUser();
          if (result.error || !result.data.user) throw new Error('Session unavailable');
          id = result.data.user.id;
        }
        return verifiedRole(client, id, readBuroId());
      };
      const rol = await Promise.race([work(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Role lookup timed out')), timeoutMs);
        timers.add(timer);
      })]);
      if (current === generation) emit({ rol, loading: false, error: null });
    } catch {
      if (current === generation) emit({ rol: null, loading: false,
        error: 'Menü yetkileri yüklenemedi. Tekrar deneyiniz; sorun sürerse yeniden giriş yapınız.' });
    } finally {
      if (timer) { clearTimeout(timer); timers.delete(timer); }
    }
  }
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      generation++;
      clearTimeout(scheduled);
      emit({ rol: null, loading: false, error: 'Oturum kapandı. Yeniden giriş yapınız.' });
      return;
    }
    if (session?.user || event === 'INITIAL_SESSION') {
      generation++;
      clearTimeout(scheduled);
      // Run database calls after the auth callback releases its session lock.
      scheduled = setTimeout(() => { void refresh(session?.user.id); }, 0);
    }
  });
  void refresh();
  return { refresh: () => refresh(), dispose() {
    disposed = true; generation++;
    subscription.unsubscribe(); clearTimeout(scheduled);
    timers.forEach(clearTimeout); timers.clear();
  } };
}
