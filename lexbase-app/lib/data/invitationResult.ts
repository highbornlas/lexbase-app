export function invitationResult(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Davet sonucu doğrulanamadı. Üyelik durumunu kontrol edin.');
  }
  const result=payload as {status?: unknown; message?: unknown; error?: unknown};
  const states: Record<string,'aktif'|'davet_gonderildi'> = {
    invited:'davet_gonderildi',invitation_pending:'davet_gonderildi',
    already_member:'aktif',existing_user_added:'aktif',reactivated:'aktif',
  };
  if (result.error || typeof result.status !== 'string' || !Object.hasOwn(states,result.status)) {
    throw new Error('Davet sonucu doğrulanamadı. Üyelik durumu değiştirilmedi.');
  }
  return {status:result.status,durum:states[result.status],message:typeof result.message==='string'?result.message:undefined};
}
