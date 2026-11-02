// @ts-nocheck
import { authorizeInvite,authorizeReactivation,InviteAuthorizationError } from './authorization.ts';

const corsHeaders={
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resolveInviteRedirect(env: (name: string) => string|undefined): string|undefined {
  const appUrl=
    env("PUBLIC_APP_URL")||
    env("APP_URL")||
    env("SITE_URL");

  if(!appUrl) return undefined;

  try {
    const url=new URL("/auth/callback?next=/dashboard",appUrl);
    if(url.username||url.password||(url.protocol!=='https:'
      &&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))) {
      throw new Error('Invalid application origin');
    }
    return url.toString();
  } catch {
    throw new InviteAuthorizationError('Davet yonlendirme ayari dogrulanamadi.',503);
  }
}

async function findAuthUser(admin,email: string) {
  const perPage=200;
  for(let page=1;page<=100;page++) {
    const { data,error }=await admin.auth.admin.listUsers({ page,perPage });
    if(error||!Array.isArray(data?.users)) {
      throw new InviteAuthorizationError('Kullanici dizini dogrulanamadi. Davet islemi yapilmadi.',503);
    }
    const match=data.users.find((user) => user.email?.trim().toLowerCase()===email);
    if(match) return match;
    if(data.users.length<perPage) return null;
  }
  throw new InviteAuthorizationError('Kullanici dizini sorgu sinirina ulasti. Davet islemi yapilmadi.',503);
}

function incompleteInvite() {
  return jsonRes({    
status: 'invite_setup_incomplete',email_sent: true,
    error: 'Davet e-postasi gonderildi ancak hesap/uyelik kurulumu tamamlanamadi. Kullaniciya yeniden aktif uyelik vermeden once kayitlari kontrol edin.'  
},503);
}

// Inject transport/configuration for offline HTTP tests with no real accounts.
export function createInviteHandler({ createClient,env,fetch: sendFetch=globalThis.fetch }) {
  return async (req: Request) => {
    // CORS preflight
    if(req.method==="OPTIONS") {
      return new Response(null,{ headers: corsHeaders });
    }
    if(req.method!=='POST') return jsonRes({ error: 'Yalniz POST desteklenir.' },405);

    try {
      const supabaseUrl=env("SUPABASE_URL");
      const serviceKey=env("SUPABASE_SERVICE_ROLE_KEY");
      const resendKey=env("RESEND_API_KEY");

      // Çağıranın token'ı
      const authHeader=req.headers.get("Authorization");
      if(!authHeader) {
        return jsonRes({ error: "Yetkilendirme gerekli" },401);
      }
      const anonKey=env('SUPABASE_ANON_KEY');
      if(!supabaseUrl||!serviceKey||!anonKey) return jsonRes({ error: 'Davet servisi yapilandirmasi eksik.' },503);

      // Çağıranı doğrula
      const callerClient=createClient(supabaseUrl,anonKey,{
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller },error: authError }=await callerClient.auth.getUser();
      if(authError||!caller) {
        return jsonRes({ error: "Geçersiz oturum" },401);
      }

      // Admin client
      const admin=createClient(supabaseUrl,serviceKey,{
        auth: { autoRefreshToken: false,persistSession: false },
      });

      // Request body
      let body;
      try { body=await req.json(); } catch { return jsonRes({ error: 'Gecerli JSON gerekli.' },400); }
      if(!body||typeof body!=='object'||Array.isArray(body)) return jsonRes({ error: 'Gecersiz davet bilgileri.' },400);
      const { email,ad,rol,buro_id }=body;
      if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ||typeof ad!=='string'||!ad.trim()||ad.length>200) {
        return jsonRes({ error: "E-posta ve ad zorunludur" },400);
      }
      // Authorization comes only from a confirmed active membership, never an
      // editable profile or user_metadata. Older single-bureau clients still work.
      const authorization=await authorizeInvite(admin,caller.id,buro_id,rol);
      const callerBuroId=authorization.buroId;
      const callerRol=authorization.callerRole;
      const normalizedEmail=email.trim().toLowerCase();
      const normalizedRol=authorization.role;

      // Büro adını al (bildirim ve e-posta için)
      const { data: buroData,error: buroError }=await admin
        .from("burolar")
        .select("ad")
        .eq("id",callerBuroId)
        .single();
      if(buroError||!buroData) return jsonRes({ error: 'Davet edilecek buro dogrulanamadi.' },503);
      const buroAd=buroData?.ad||"Bilinmeyen Büro";
      const callerAd=caller.user_metadata?.ad||caller.email?.split("@")[0]||"Yönetici";

      // ── Bu e-posta zaten kayıtlı mı? ──────────────────────────
      const existingUser=await findAuthUser(admin,normalizedEmail);

      if(existingUser) {
        // ── SENARYO 2: Mevcut kullanıcı → yeni büro üyeliği ekle ──

        // Zaten bu büroda üyeliği var mı?
        const { data: mevcutUyelik,error: membershipReadError }=await admin
          .from("uyelikler")
          .select("id, durum, rol")
          .eq("auth_id",existingUser.id)
          .eq("buro_id",callerBuroId)
          .maybeSingle();
        if(membershipReadError) return jsonRes({ error: 'Mevcut uyelik dogrulanamadi.' },503);

        if(mevcutUyelik) {
          if(mevcutUyelik.durum==="pasif") {
            if(!existingUser.email_confirmed_at) return jsonRes({ error: 'Hesabin e-posta dogrulamasi tamamlanmadan uyelik etkinlestirilemez.' },409);
            authorizeReactivation(callerRol,mevcutUyelik.rol);
            // ── SENARYO 3: Pasif üyeliği yeniden aktifleştir ──
            const { data: reactivated,error: reactivationError }=await admin
              .from("uyelikler")
              .update({ durum: "aktif",rol: normalizedRol })
              .eq("id",mevcutUyelik.id)
              .eq("buro_id",callerBuroId)
              .eq("durum","pasif")
              .eq("rol",mevcutUyelik.rol)
              .select('id')
              .single();
            if(reactivationError||!reactivated?.id) return jsonRes({ error: 'Uyelik yeniden etkinlestirilemedi.' },503);

            // Uygulama içi bildirim
            const notified=await insertBildirim(admin,callerBuroId,existingUser.id,{
              tip: "sistem",
              baslik: `${buroAd} bürosuna tekrar eklendiniz`,
              mesaj: `${callerAd} sizi ${normalizedRol} olarak tekrar aktifleştirdi.`,
              link: "/dashboard",
            });

            // E-posta bildirimi
            const emailed=resendKey? await sendEmail(sendFetch,resendKey,normalizedEmail,ad,buroAd,callerAd,normalizedRol,"reactivated"):null;
            const warnings=deliveryWarnings(notified,emailed);

            return jsonRes({
              status: "reactivated",
              message: `${ad} tekrar aktifleştirildi. ${deliveryMessage(warnings)}`,
              warnings,
            });
          }

          if(mevcutUyelik.durum==='davet_gonderildi') {
            // Older clients recognize only "invited" as a pending membership.
            return jsonRes({ status: 'invited',pending_existing: true,message: 'Bu buro icin davet bekliyor. Yeniden e-posta gonderilmedi; uyelik etkinlestirilmedi.' });
          }
          if(mevcutUyelik.durum!=='aktif') return jsonRes({ error: 'Mevcut uyelik durumu dogrulanamadi.' },409);

          return jsonRes({
            status: "already_member",
            message: `${normalizedEmail} zaten bu büroda kayıtlı.`,
          });
        }

        if(!existingUser.email_confirmed_at) {
          return jsonRes({ error: 'Hesabin e-posta dogrulamasi tamamlanmadan aktif uyelik eklenemez.' },409);
        }

        // Yeni üyelik ekle
        const { data: added,error: uyelikErr }=await admin.from("uyelikler").insert({
          auth_id: existingUser.id,
          buro_id: callerBuroId,
          rol: normalizedRol,
          durum: "aktif",
        }).select('id').single();

        if(uyelikErr||!added?.id) {
          return jsonRes({ error: 'Uyelik kaydi dogrulanamadi.' },503);
        }

        // Uygulama içi bildirim
        const notified=await insertBildirim(admin,callerBuroId,existingUser.id,{
          tip: "sistem",
          baslik: `${buroAd} bürosuna eklendiniz`,
          mesaj: `${callerAd} sizi ${normalizedRol} olarak ekledi. Sidebar'dan büro değiştirebilirsiniz.`,
          link: "/dashboard",
        });

        // E-posta bildirimi
        const emailed=resendKey? await sendEmail(sendFetch,resendKey,normalizedEmail,ad,buroAd,callerAd,normalizedRol,"existing_user_added"):null;
        const warnings=deliveryWarnings(notified,emailed);

        return jsonRes({
          status: "existing_user_added",
          message: `${ad} (${normalizedEmail}) büronuza eklendi. ${deliveryMessage(warnings)}`,
          warnings,
        });

      } else {
        // ── SENARYO 1: Yeni kullanıcı → davet gönder ──────────

        // Supabase ile davet e-postası gönder
        const redirectTo=resolveInviteRedirect(env);
        const inviteOptions: {
          data: { ad: string; rol: string; buro_id: string };
          redirectTo?: string;
        }={
          data: { ad,rol: normalizedRol,buro_id: callerBuroId },
        };

        if(redirectTo) {
          inviteOptions.redirectTo=redirectTo;
        }

        const { data: inviteData,error: inviteErr }=await admin.auth.admin.inviteUserByEmail(
          normalizedEmail,
          inviteOptions
        );

        if(inviteErr) {
          return jsonRes({ error: 'Davet saglayicisi islemi onaylamadi. Yeniden denemeden once uyelik kaydini kontrol edin.' },500);
        }

        const newUserId=inviteData?.user?.id;
        if(!newUserId||inviteData.user.email?.trim().toLowerCase()!==normalizedEmail) return incompleteInvite();

        // kullanicilar kaydı oluştur
        const { data: profile,error: profileError }=await admin.from("kullanicilar").upsert({
          auth_id: newUserId,
          buro_id: callerBuroId,
          firm_id: callerBuroId,
          email: normalizedEmail,
          ad,
          rol: normalizedRol,
        },{ onConflict: "auth_id" }).select('auth_id').single();
        if(profileError||profile?.auth_id!==newUserId) return incompleteInvite();

        // uyelikler kaydı oluştur
        const { data: pendingMembership,error: pendingError }=await admin.from("uyelikler").insert({
          auth_id: newUserId,
          buro_id: callerBuroId,
          rol: normalizedRol,
          durum: "davet_gonderildi",
        }).select('id').single();
        if(pendingError||!pendingMembership?.id) return incompleteInvite();

        // Uygulama içi bildirim (giriş yaptığında görecek)
        const notified=await insertBildirim(admin,callerBuroId,newUserId,{
          tip: "sistem",
          baslik: `${buroAd} bürosuna hoş geldiniz!`,
          mesaj: `${callerAd} sizi ${normalizedRol} olarak davet etti.`,
          link: "/dashboard",
        });
        const warnings=deliveryWarnings(notified,null);
        return jsonRes({
          status: "invited",
          message: `${normalizedEmail} adresine davet e-postası gönderildi.${warnings.length? ' Uygulama ici bildirim kaydedilemedi.':''}`,
          warnings,
        });
      }

    } catch(err: any) {
      if(err instanceof InviteAuthorizationError) return jsonRes({ error: err.message },err.status);
      console.error('invite_user_failed');
      return jsonRes({ error: 'Davet islemi dogrulanamadi. Yeniden denemeden once uyelik kaydini kontrol edin.' },503);
    }
  };
}

// ── Yardımcı: Bildirim ekle ─────────────────────────────────────
async function insertBildirim(
  admin: any,
  buroId: string,
  hedefAuthId: string,
  bildirim: { tip: string; baslik: string; mesaj: string; link: string }
) {
  try {
    const { data,error }=await admin.from("bildirimler").insert({
      buro_id: buroId,
      hedef_auth_id: hedefAuthId,
      tip: bildirim.tip,
      baslik: bildirim.baslik,
      mesaj: bildirim.mesaj,
      link: bildirim.link,
      okundu: false,
    }).select('id').single();
    return !error&&!!data?.id;
  } catch(e) {
    return false;
  }
}

// ── Yardımcı: E-posta gönder (Resend) ───────────────────────────
async function sendEmail(
  sendFetch: typeof globalThis.fetch,
  apiKey: string,
  toEmail: string,
  toName: string,
  buroAd: string,
  callerAd: string,
  rol: string,
  type: "existing_user_added"|"reactivated"|"invited"
) {
  // Presentation fields are not trusted HTML, even when read from metadata.
  toName=escapeHtml(toName); buroAd=escapeHtml(buroAd); callerAd=escapeHtml(callerAd);
  const rolLabel: Record<string,string>={
    sahip: "Büro Sahibi",
    yonetici: "Yönetici",
    avukat: "Avukat",
    stajyer: "Stajyer",
    sekreter: "Sekreter",
  };

  const rolText=rolLabel[rol]||rol;

  let subject: string;
  let body: string;

  if(type==="existing_user_added") {
    subject=`${buroAd} bürosuna eklendiniz — LexBase`;
    body=`
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
  } else if(type==="reactivated") {
    subject=`${buroAd} bürosunda tekrar aktifsiniz — LexBase`;
    body=`
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
    return false; // invited → Supabase sends its own invitation email.
  }

  try {
    const response=await sendFetch("https://api.resend.com/emails",{
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
    return response.ok;
  } catch(e) {
    return false;
  }
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g,(char) => ({ '&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;' }[char]));
}

function deliveryWarnings(notified: boolean,emailed: boolean|null) {
  return [...(notified? []:['notification_failed']),...(emailed===false? ['email_failed']:[])];
}

function deliveryMessage(warnings: string[]) {
  return warnings.length? 'Uyelik kaydedildi; bildirim veya ek e-posta teslimi tamamlanamadi. Yeniden davet etmeyin, uyelik mevcuttur.':'Uygulama ici bildirim kaydedildi.';
}

// ── Yardımcı: JSON response ──────────────────────────────────────
function jsonRes(data: any,status=200) {
  return new Response(JSON.stringify(data),{
    status,
    headers: { ...corsHeaders,"Content-Type": "application/json" },
  });
}
