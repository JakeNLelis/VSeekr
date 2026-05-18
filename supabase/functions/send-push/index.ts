import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type PushRequest = {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: PushRequest;
  try {
    payload = (await req.json()) as PushRequest;
  } catch (_err) {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!payload?.user_id || !payload.title || !payload.body) {
    return new Response("Missing required fields", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase env", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("id", payload.user_id)
    .single();

  if (error || !profile?.expo_push_token) {
    return new Response("No push token", { status: 200 });
  }

  const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: profile.expo_push_token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }),
  });

  const result = await expoResponse.json();
  return new Response(JSON.stringify(result), {
    status: expoResponse.ok ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  });
});
