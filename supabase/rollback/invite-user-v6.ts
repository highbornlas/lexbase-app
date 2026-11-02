import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonRes({ error: "Yetkilendirme gerekli" }, 401);
    }

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return jsonRes({ error: "Geçersiz oturum" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerUyelik } = await admin
      .from("uyelikler")
      .select("buro_id, rol")
      .eq("auth_id", caller.id)
      .eq("durum", "aktif")
      .in("rol", ["sahip", "yonetici"])
      .limit(1)
      .single();

    let callerBuroId: string;
    let callerRol: string;

    if (callerUyelik) {
      callerBuroId = callerUyelik.buro_id;
      callerRol = callerUyelik.rol;
    } else {
      const { data: callerKul } = await admin
        .from("kullanicilar")
        .select("buro_id, rol")
        .eq("auth_id", caller.id)
        .single();

      if (!callerKul || !["sahip", "yonetici"].includes(callerKul.rol)) {
        return jsonRes({ error: "Personel ekleme yetkiniz yok. Sahip veya yönetici olmalısınız." }, 403);
      }
      callerBuroId = callerKul.buro_id;
      callerRol = callerKul.rol;
    }

    const { email, ad, rol } = await req.json();
    if (!email || !ad) {
      return jsonRes({ error: "E-posta ve ad zorunludur" }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRol = rol || "avukat";

    const { data: buroData } = await admin
      .from("burolar")
      .select("ad")
      .eq("id", callerBuroId)
      .single();
    const buroAd = buroData?.ad || "Bilinmeyen Büro";
    const callerAd = caller.user_metadata?.ad || caller.email?.split("@")[0] || "Yönetici";

    const { data: { users } } = await admin.auth.admin.listUsers();
    const existingUser = users?.find((u: any) => u.email === normalizedEmail);

    if (existingUser) {
      const { data: mevcutUyelik } = await admin
        .from("uyelikler")
        .select("id, durum")
        .eq("auth_id", existingUser.id)
        .eq("buro_id", callerBuroId)
        .single();

      if (mevcutUyelik) {
        if (mevcutUyelik.durum === "pasif") {
          await admin
            .from("uyelikler")
            .update({ durum: "aktif", rol: normalizedRol })
            .eq("id", mevcutUyelik.id);

          await insertBildirim(admin, callerBuroId, existingUser.id, {
            tip: "sistem",
            baslik: `${buroAd} bürosuna tekrar eklendiniz`,
            mesaj: `${callerAd} sizi ${normalizedRol} olarak tekrar aktifleştirdi.`,
            link: "/dashboard",
          });

          if (resendKey) {
            await sendEmail(resendKey, normalizedEmail, ad, buroAd, callerAd, normalizedRol, "reactivated");
          }

          return jsonRes({
            status: "reactivated",
            message: `${ad} tekrar aktifleştirildi. Bildirim gönderildi.`,
          });
        }

        return jsonRes({
          status: "already_member",
          message: `${normalizedEmail} zaten bu büroda kayıtlı.`,
        });
      }

      const { error: uyelikErr } = await admin.from("uyelikler").insert({
        auth_id: existingUser.id,
        buro_id: callerBuroId,
        rol: normalizedRol,
        durum: "aktif",
      });

      if (uyelikErr) {
        return jsonRes({ error: `Üyelik oluşturulamadı: ${uyelikErr.message}` }, 500);
      }

      await insertBildirim(admin, callerBuroId, existingUser.id, {
        tip: "sistem",
        baslik: `${buroAd} bürosuna eklendiniz`,
        mesaj: `${callerAd} sizi ${normalizedRol} olarak ekledi. Sidebar'dan büro değiştirebilirsiniz.`,
        link: "/dashboard",
      });

      if (resendKey) {
        await sendEmail(resendKey, normalizedEmail, ad, buroAd, callerAd, normalizedRol, "existing_user_added");
      }

      return jsonRes({
        status: "existing_user_added",
        message: `${ad} (${normalizedEmail}) büronuza eklendi. Bildirim gönderildi.`,
      });

    } else {
      const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: { ad, rol: normalizedRol, buro_id: callerBuroId },
          redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/auth/callback`,
        }
      );

      if (inviteErr) {
        return jsonRes({ error: `Davet gönderilemedi: ${inviteErr.message}` }, 500);
      }

      const newUserId = inviteData.user?.id;

      if (newUserId) {
        await admin.from("kullanicilar").upsert({
          auth_id: newUserId,
          buro_id: callerBuroId,
          ad,
          rol: normalizedRol,
        }, { onConflict: "auth_id" });

        await admin.from("uyelikler").insert({
          auth_id: newUserId,
          buro_id: callerBuroId,
          rol: normalizedRol,
          durum: "davet_gonderildi",
        });

        await insertBildirim(admin, callerBuroId, newUserId, {
          tip: "sistem",
          baslik: `${buroAd} bürosuna hoş geldiniz!`,
          mesaj: `${callerAd} sizi ${normalizedRol} olarak davet etti.`,
          link: "/dashboard",
        });
      }

      return jsonRes({
        status: "invited",
        message: `${normalizedEmail} adresine davet e-postası gönderildi.`,
      });
    }

  } catch (err: any) {
    console.error("invite-user error:", err);
    return jsonRes({ error: err.message || "Sunucu hatası" }, 500);
  }
});

async function insertBildirim(
  admin: any,
  buroId: string,
  hedefAuthId: string,
  bildirim: { tip: string; baslik: string; mesaj: string; link: string }
) {
  try {
    await admin.from("bildirimler").insert({
      buro_id: buroId,
      hedef_auth_id: hedefAuthId,
      tip: bildirim.tip,
      baslik: bildirim.baslik,
      mesaj: bildirim.mesaj,
      link: bildirim.link,
      okundu: false,
    });
  } catch (e) {
    console.error("Bildirim eklenemedi:", e);
  }
}

async function sendEmail(
  apiKey: string,
  toEmail: string,
  toName: string,
  buroAd: string,
  callerAd: string,
  rol: string,
  type: "existing_user_added" | "reactivated" | "invited"
) {
  const rolLabel: Record<string, string> = {
    sahip: "Büro Sahibi",
    yonetici: "Yönetici",
    avukat: "Avukat",
    stajyer: "Stajyer",
    sekreter: "Sekreter",
  };

  const rolText = rolLabel[rol] || rol;

  let subject: string;
  let body: string;

  if (type === "existing_user_added") {
    subject = `${buroAd} bürosuna eklendiniz — LexBase`;
    body = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1117; color: #E6EDF3; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="color: #D4AF37; font-size: 24px; font-weight: bold;">Lex</span><span style="color: #E6EDF3; font-size: 24px; font-weight: bold;">Base</span>
        </div>
        <h2 style="color: #D4AF37; font-size: 18px; margin: 0 0 16px;">Yeni Büro Üyeliği</h2>
        <p style="color: #8B95A5; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
          Merhaba <strong style="color: #E6EDF3;">${toName}</strong>,
        </p>
        <p style="color: #8B95A5; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          <strong style="color: #E6EDF3;">${callerAd}</strong>, sizi <strong style="color: #D4AF37;">${buroAd}</strong> bürosuna <strong style="color: #E6EDF3;">${rolText}</strong> olarak ekledi.
        </p>
        <div style="background: #161B22; border: 1px solid #30363D; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #8B95A5; font-size: 13px; margin: 0;">
            📌 Mevcut hesabınızla giriş yapın ve sidebar'daki büro seçiciden <strong style="color: #D4AF37;">${buroAd}</strong>'a geçiş yapabilirsiniz.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="https://lexbase.app/dashboard" style="display: inline-block; background: #D4AF37; color: #0D1117; padding: 10px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">LexBase'e Gir</a>
        </div>
        <p style="color: #484F58; font-size: 11px; text-align: center; margin-top: 24px;">
          Bu e-posta LexBase tarafından otomatik gönderilmiştir.
        </p>
      </div>
    `;
  } else if (type === "reactivated") {
    subject = `${buroAd} bürosunda tekrar aktifsiniz — LexBase`;
    body = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1117; color: #E6EDF3; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="color: #D4AF37; font-size: 24px; font-weight: bold;">Lex</span><span style="color: #E6EDF3; font-size: 24px; font-weight: bold;">Base</span>
        </div>
        <h2 style="color: #D4AF37; font-size: 18px; margin: 0 0 16px;">Üyelik Yeniden Aktifleştirildi</h2>
        <p style="color: #8B95A5; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Merhaba <strong style="color: #E6EDF3;">${toName}</strong>, <strong style="color: #E6EDF3;">${callerAd}</strong> sizi <strong style="color: #D4AF37;">${buroAd}</strong> bürosunda tekrar aktifleştirdi.
        </p>
        <div style="text-align: center;">
          <a href="https://lexbase.app/dashboard" style="display: inline-block; background: #D4AF37; color: #0D1117; padding: 10px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">LexBase'e Gir</a>
        </div>
        <p style="color: #484F58; font-size: 11px; text-align: center; margin-top: 24px;">
          Bu e-posta LexBase tarafından otomatik gönderilmiştir.
        </p>
      </div>
    `;
  } else {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LexBase <bildirim@lexbase.app>",
        to: [toEmail],
        subject,
        html: body,
      }),
    });
  } catch (e) {
    console.error("E-posta gönderilemedi:", e);
  }
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
