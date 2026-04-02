import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their JWT
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "digidromen_admin") {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, name, role, organizationId } = body;

      if (!email || !password || !name || !role || !organizationId) {
        return new Response(JSON.stringify({ error: "Missing required fields: email, password, name, role, organizationId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create profile
      const profileId = `user-${crypto.randomUUID().slice(0, 8)}`;
      const { error: profileError } = await adminClient.from("user_profiles").insert({
        id: profileId,
        auth_user_id: authUser.user.id,
        organization_id: organizationId,
        name,
        email,
        role,
      });

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ id: profileId, authUserId: authUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-role") {
      const { profileId, role } = body;

      if (!profileId || !role) {
        return new Response(JSON.stringify({ error: "Missing profileId or role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient
        .from("user_profiles")
        .update({ role })
        .eq("id", profileId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      const { profileId } = body;

      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get auth_user_id from profile
      const { data: profile } = await adminClient
        .from("user_profiles")
        .select("id, auth_user_id")
        .eq("id", profileId)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [{ count: orderCount }, { count: repairCount }] = await Promise.all([
        adminClient
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("requester_user_id", profile.id),
        adminClient
          .from("repair_cases")
          .select("id", { count: "exact", head: true })
          .eq("requester_user_id", profile.id),
      ]);

      if ((orderCount ?? 0) === 0 && (repairCount ?? 0) === 0) {
        const { error: deleteProfileError } = await adminClient
          .from("user_profiles")
          .delete()
          .eq("id", profileId);

        if (deleteProfileError) {
          return new Response(JSON.stringify({ error: deleteProfileError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (profile.auth_user_id) {
          const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(profile.auth_user_id);
          if (deleteAuthError) {
            return new Response(JSON.stringify({ error: deleteAuthError.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(JSON.stringify({ success: true, mode: "deleted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile?.auth_user_id) {
        await adminClient.auth.admin.updateUserById(profile.auth_user_id, {
          ban_duration: "876000h", // ~100 years
        });
      }

      return new Response(JSON.stringify({ success: true, mode: "deactivated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "invite") {
      const { email, name, role, organizationId } = body;

      if (!email || !name || !role || !organizationId) {
        return new Response(JSON.stringify({ error: "Missing required fields: email, name, role, organizationId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Invite via Supabase Auth admin (sends magic link email)
      const { data: authData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create profile
      const profileId = `user-${crypto.randomUUID().slice(0, 8)}`;
      const { data: profile, error: profileError } = await adminClient
        .from("user_profiles")
        .insert({
          id: profileId,
          auth_user_id: authData.user.id,
          organization_id: organizationId,
          name,
          email,
          role,
        })
        .select()
        .single();

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ profile }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: profiles, error } = await adminClient
        .from("user_profiles")
        .select("id, auth_user_id, name, email, role, organization_id")
        .order("name");

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ profiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
