// /api/durum-mail — durum değişince: 1) öğrenciye kendi dilinde mail
//                                    2) öğrenci bir acentaya bağlıysa acentaya bilgi maili
// Env: SB_URL, SB_SECRET, RESEND_API_KEY, RESEND_FROM

const TXT = {
  tr: {
    subj: u => `Başvuru durumunuz güncellendi — ${u}`,
    hello: n => `Sayın ${n},`,
    body: u => `${u} başvurunuzla ilgili yeni bir gelişme var:`,
    foot: "Süreç boyunca tüm gelişmeler bu adrese bildirilecektir. Sorularınız için bize her zaman ulaşabilirsiniz.",
    team: "Al Azim Danışmanlık Ekibi",
    st: {
      new:"Başvurunuz alınmıştır.", review:"Başvurunuz inceleme aşamasındadır.",
      sent_to_uni:"Başvurunuz üniversiteye iletilmiştir.",
      accepted:"Tebrikler! Başvurunuz üniversite tarafından KABUL edilmiştir. 🎉",
      deposit_pending:"Kayıt için depozito ödemesi beklenmektedir. Detaylar için sizinle iletişime geçilecektir.",
      deposit_paid:"Depozito ödemeniz alınmıştır, kabul mektubunuz hazırlanıyor.",
      letter_sent:"Resmi kabul mektubunuz gönderilmiştir. Hayırlı olsun! 🎓",
      rejected:"Başvurunuz maalesef olumlu sonuçlanmamıştır. Alternatif seçenekler için sizinle iletişime geçeceğiz."
    }
  },
  en: {
    subj: u => `Your application status has been updated — ${u}`,
    hello: n => `Dear ${n},`,
    body: u => `There is an update regarding your application to ${u}:`,
    foot: "We will keep you informed of every step at this email address. Feel free to contact us anytime.",
    team: "Al Azim Consulting Team",
    st: {
      new:"Your application has been received.", review:"Your application is under review.",
      sent_to_uni:"Your application has been submitted to the university.",
      accepted:"Congratulations! Your application has been ACCEPTED by the university. 🎉",
      deposit_pending:"A deposit payment is required to secure your enrollment. We will contact you with the details.",
      deposit_paid:"Your deposit has been received; your acceptance letter is being prepared.",
      letter_sent:"Your official acceptance letter has been sent. Congratulations! 🎓",
      rejected:"Unfortunately, your application was not successful. We will contact you about alternative options."
    }
  },
  ru: {
    subj: u => `Статус вашей заявки обновлён — ${u}`,
    hello: n => `Уважаемый(ая) ${n},`,
    body: u => `Есть обновление по вашей заявке в ${u}:`,
    foot: "Мы будем сообщать вам о каждом этапе на этот адрес. Вы всегда можете связаться с нами.",
    team: "Команда Al Azim Consulting",
    st: {
      new:"Ваша заявка получена.", review:"Ваша заявка находится на рассмотрении.",
      sent_to_uni:"Ваша заявка передана в университет.",
      accepted:"Поздравляем! Ваша заявка ПРИНЯТА университетом. 🎉",
      deposit_pending:"Для зачисления требуется оплата депозита. Мы свяжемся с вами с деталями.",
      deposit_paid:"Ваш депозит получен, письмо о зачислении готовится.",
      letter_sent:"Официальное письмо о зачислении отправлено. Поздравляем! 🎓",
      rejected:"К сожалению, ваша заявка не была одобрена. Мы свяжемся с вами по поводу альтернатив."
    }
  },
  tk: {
    subj: u => `Arzaňyzyň ýagdaýy täzelendi — ${u}`,
    hello: n => `Hormatly ${n},`,
    body: u => `${u} boýunça arzaňyz barada täzelik bar:`,
    foot: "Ähli täzelikler şu salga habar berler. Islendik wagt biz bilen habarlaşyp bilersiňiz.",
    team: "Al Azim Consulting topary",
    st: {
      new:"Arzaňyz kabul edildi.", review:"Arzaňyz seredilýär.",
      sent_to_uni:"Arzaňyz uniwersitete iberildi.",
      accepted:"Gutlaýarys! Arzaňyz uniwersitet tarapyndan KABUL edildi. 🎉",
      deposit_pending:"Okuwa ýazylmak üçin öňünden töleg (depozit) garaşylýar. Jikme-jiklikler üçin siziň bilen habarlaşarys.",
      deposit_paid:"Depozit tölegiňiz kabul edildi, kabul haty taýýarlanýar.",
      letter_sent:"Resmi kabul hatyňyz iberildi. Gutly bolsun! 🎓",
      rejected:"Gynansak-da, arzaňyz kabul edilmedi. Başga mümkinçilikler barada siziň bilen habarlaşarys."
    }
  }
};

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

async function sbGet(path){
  const r = await fetch(process.env.SB_URL + "/rest/v1/" + path, {
    headers: { apikey: process.env.SB_SECRET, Authorization: "Bearer " + process.env.SB_SECRET }
  });
  if (!r.ok) throw new Error("Supabase REST: " + r.status);
  return r.json();
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

  try {
    // 1) admin doğrulama
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

    // 2) başvuru + öğrenci + acenta
    const { application_id } = req.body || {};
    if (!application_id) return res.status(400).json({ error:"application_id required" });
    const apps = await sbGet(
      `applications?id=eq.${application_id}&select=status,university,app_no,students(first_name,last_name,email,lang,agencies(name,email))`);
    if (!apps.length) return res.status(404).json({ error:"application not found" });
    const app = apps[0], st = app.students;

    // 3) öğrenciye kendi dilinde
    let studentOk = false;
    if (st?.email){
      const L = TXT[st.lang] || TXT.tk;
      const name = `${st.first_name} ${st.last_name}`.trim();
      const msg = L.st[app.status] || app.status;
      const html = shell(`
        <p style="margin:0 0 12px"><b>${esc(L.hello(name))}</b></p>
        <p style="margin:0 0 16px">${L.body(esc(app.university))}</p>
        <div style="background:#f6f1df;border-left:4px solid #d4af37;padding:14px 16px;border-radius:8px;font-weight:700">${msg}</div>
        <p style="margin:18px 0 0;color:#5a6478;font-size:13.5px">${L.foot}</p>
        <p style="margin:22px 0 0;font-weight:700">${L.team}</p>`);
      studentOk = await resend([st.email], L.subj(app.university), html);
    }

    // 4) acentaya bilgi (öğrenci bir acentaya bağlıysa)
    let agencyOk = false;
    const ag = st?.agencies;
    if (ag?.email){
      const trMsg = (TXT.tr.st[app.status] || app.status);
      const html = shell(`
        <p style="margin:0 0 12px"><b>Sayın ${esc(ag.name)},</b></p>
        <p style="margin:0 0 16px">Öğrenciniz <b>${esc(st.first_name)} ${esc(st.last_name)}</b>'in
        <b>#${esc(app.app_no||"")}</b> numaralı ${esc(app.university)} başvurusunda güncelleme var:</p>
        <div style="background:#f6f1df;border-left:4px solid #d4af37;padding:14px 16px;border-radius:8px;font-weight:700">${trMsg}</div>
        <p style="margin:18px 0 0;font-size:13.5px">Detaylar:
          <a href="https://portal.alazimdanismanlik.com" style="color:#b8962e;font-weight:700">portal.alazimdanismanlik.com</a></p>`);
      agencyOk = await resend([ag.email],
        `📌 #${app.app_no||""} ${st.first_name} ${st.last_name} — durum güncellendi`, html);
    }

    return res.status(200).json({ ok: studentOk || agencyOk, student: studentOk, agency: agencyOk });
  } catch (e){
    return res.status(500).json({ error: e.message });
  }
}
