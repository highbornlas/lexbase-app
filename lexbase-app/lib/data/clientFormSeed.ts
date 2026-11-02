export interface ClientFormSeed {
  id: string;
  ad: string;
  soyad?: string;
}

export function clientFormSeed(client?: ClientFormSeed) {
  if (!client?.id) return {};
  return {
    muvId: client.id,
    muvekkilTaraflar: [{ id: client.id, ad: [client.ad, client.soyad].filter(Boolean).join(' ') }],
  };
}
