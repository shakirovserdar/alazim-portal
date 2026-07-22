// /api/acenta-mail — acenta mailleri (Resend)
//   type: "welcome" → onaylanan acentaya hoş geldin maili (admin token gerekir)
//   type: "new"     → yeni acenta başvurusunda admine bildirim (kayıt sayfası çağırır)
// Ek env (portal projesi): ADMIN_EMAIL — bildirimlerin gideceği adres(ler), virgülle çoğul
//   (yoksa alazimdanismanlik@gmail.com kullanılır)

async function sbGet(path){
  const r = await fetch(process.env.SB_URL + "/rest/v1/" + path, {
    headers: { apikey: process.env.SB_SECRET, Authorization: "Bearer " + process.env.SB_SECRET }
  });
  if (!r.ok) throw new Error("Supabase REST: " + r.status);
  return r.json();
}

function esc(s){ return String(s||"").replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function shell(inner){
  return `<div style="background:#0e1526;padding:32px 16px;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#d4af37,#b8962e);padding:22px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#0e1526;letter-spacing:.5px">AL AZIM</div>
        <div style="font-size:12px;color:#0e1526;opacity:.75">alazimdanismanlik.com</div>
      </div>
      <div style="padding:28px 26px;color:#1c2333;font-size:15px;line-height:1.7">${inner}</div>
      <div style="background:#f2f4f9;padding:14px;text-align:center;color:#8a93a8;font-size:12px">
        Şirinevler Mah. Meriç Sok. No:20, İstanbul · +90 534 689 84 93
      </div>
    </div></div>`;
}

async function resend(to, subject, html){
  const r = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Authorization:"Bearer " + process.env.RESEND_API_KEY },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html })
  });
  return r.ok;
}

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ error:"POST only" });
  try{
    const { type, agency_id, name, email, phone, company, city, country } = req.body || {};
    const admins = (process.env.ADMIN_EMAIL || "alazimdanismanlik@gmail.com")
                   .split(",").map(s=>s.trim()).filter(Boolean);

    // ---- yeni acenta başvurusu → admine bildirim (token gerekmez) ----
    if (type === "new"){
      const html = shell(`
        <p style="margin:0 0 12px"><b>Yeni acenta başvurusu geldi 🔔</b></p>
        <table style="font-size:14px;line-height:1.9">
          <tr><td style="color:#8a93a8;padding-right:14px">Ad Soyad</td><td><b>${esc(name)}</b></td></tr>
          ${company?`<tr><td style="color:#8a93a8;padding-right:14px">Firma</td><td>${esc(company)}</td></tr>`:""}
          <tr><td style="color:#8a93a8;padding-right:14px">Konum</td><td>${esc(city)} ${esc(country)}</td></tr>
          <tr><td style="color:#8a93a8;padding-right:14px">E-posta</td><td>${esc(email)}</td></tr>
          <tr><td style="color:#8a93a8;padding-right:14px">Telefon</td><td>${esc(phone)}</td></tr>
        </table>
        <p style="margin:18px 0 0">Onaylamak için:
          <a href="https://portal.alazimdanismanlik.com/panel.html" style="color:#b8962e;font-weight:700">
          portal → Onay bekleyen</a></p>`);
      const ok = await resend(admins, `🔔 Yeni acenta başvurusu: ${name||email}`, html);
      return res.status(200).json({ ok });
    }

    // ---- onaylanan acentaya hoş geldin (admin token şart) ----
    if (type === "welcome"){
      const token = (req.headers.authorization || "").replace("Bearer ","");
      if (!token) return res.status(401).json({ error:"no token" });
      const uRes = await fetch(process.env.SB_URL + "/auth/v1/user", {
        headers: { apikey: process.env.SB_SECRET, Authorization: "Bearer " + token }
      });
      if (!uRes.ok) return res.status(401).json({ error:"invalid token" });
      const user = await uRes.json();
      const profs = await sbGet(`profiles?id=eq.${user.id}&select=role`);
      if (!profs.length || profs[0].role !== "admin")
        return res.status(403).json({ error:"admin only" });

      const ags = await sbGet(`agencies?id=eq.${agency_id}&select=name,contact_name,email`);
      if (!ags.length) return res.status(404).json({ error:"agency not found" });
      const ag = ags[0];
      if (!ag.email) return res.status(200).json({ ok:false, note:"acentanın maili yok" });

      const html = shell(`
        <p style="margin:0 0 12px"><b>Hoş geldiniz, ${esc(ag.contact_name || ag.name)}! 🤝</b></p>
        <p style="margin:0 0 16px">Al Azim Danışmanlık acenta ağına başvurunuz <b>onaylandı</b>.
        Artık panele giriş yapıp öğrencilerinizi ekleyebilir, başvurularının durumunu adım adım takip edebilirsiniz.</p>
        <div style="background:#f6f1df;border-left:4px solid #d4af37;padding:14px 16px;border-radius:8px">
          <b>Panel:</b> <a href="https://portal.alazimdanismanlik.com" style="color:#b8962e;font-weight:700">portal.alazimdanismanlik.com</a><br>
          Kayıt olduğunuz e-posta ve şifrenizle giriş yapın.
        </div>
        <p style="margin:18px 0 0;color:#5a6478;font-size:13.5px">Sorularınız için bize her zaman ulaşabilirsiniz.</p>
        <p style="margin:22px 0 0;font-weight:700">Al Azim Danışmanlık Ekibi</p>`);
      const ok = await resend([ag.email], "🤝 Acenta başvurunuz onaylandı — Al Azim Portal", html);
      return res.status(200).json({ ok });
    }

    return res.status(400).json({ error:"unknown type" });
  }catch(e){
    return res.status(500).json({ error: e.message });
  }
}
