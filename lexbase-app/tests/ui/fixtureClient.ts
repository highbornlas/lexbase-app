export function createClient() {
  return { rpc: async (name: string,args: Record<string,unknown>) => {
    const response = await fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});
    return response.json();
  } };
}
