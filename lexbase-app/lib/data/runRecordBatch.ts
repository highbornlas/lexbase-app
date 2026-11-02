export async function runRecordBatch<T>(records: readonly T[], perform: (record: T) => Promise<unknown>) {
  const succeeded: T[] = [];
  const failed: { record: T; error: unknown }[] = [];
  for (const record of records) {
    try { await perform(record); succeeded.push(record); }
    catch (error) { failed.push({record,error}); }
  }
  return {succeeded,failed};
}
