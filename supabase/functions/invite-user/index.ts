import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createInviteHandler } from './handler.ts';

Deno.serve(createInviteHandler({
  createClient,
  env: (name: string) => Deno.env.get(name),
}));
