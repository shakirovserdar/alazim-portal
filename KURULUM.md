# AL AZIM PORTAL — Aşama 1 Kurulum (adım adım)

## 1. Veritabanını kur (5 dk)
1. Supabase → sol menü **SQL Editor** → **New query**
2. `schema.sql` dosyasının TAMAMINI yapıştır → **Run**
3. Yeşil "Success" görmen lazım. (Hata verirse bana at.)

## 2. Kendini admin yap (3 dk)
1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**
   - Email: kendi mailin (mesela shakirovserdar7@gmail.com)
   - Password: güçlü bir şifre → **Auto confirm user** işaretli olsun → Create
2. **SQL Editor**'e dön, şunu çalıştır (maili kendi mailinle değiştir):
   ```sql
   update public.profiles set role = 'admin', full_name = 'Serdar Shakirov'
   where email = 'shakirovserdar7@gmail.com';
   ```
3. Aynı şekilde Halbay için de ikinci admin açabilirsin.

## 3. Vercel'e yükle (10 dk)
1. Bu `portal` klasörünü yeni bir GitHub reposuna at (örn. `alazim-portal`)
2. Vercel → **Add New Project** → repoyu seç → Framework: **Other** → Deploy
3. Vercel → proje → **Settings → Environment Variables**, şu 4'ünü ekle:
   | Name | Value |
   |---|---|
   | `SB_URL` | `https://gydvyqtynsetictrucfp.supabase.co` |
   | `SB_SECRET` | Supabase → Settings → API Keys → **sb_secret_...** (göz ikonuyla aç, kopyala) |
   | `RESEND_API_KEY` | mevcut Resend hesabındaki `re_...` key (ana sitede kullandığımızın aynısı) |
   | `RESEND_FROM` | `Al Azim Danismanlik <basvuru@alazimdanismanlik.com>` |
4. **Redeploy** (env eklendikten sonra şart).

## 4. Domain bağla (5 dk)
1. Vercel → portal projesi → **Settings → Domains** → `portal.alazimdanismanlik.com` ekle
2. Namecheap → Advanced DNS → **CNAME** kaydı:
   - Host: `portal`  ·  Value: `cname.vercel-dns.com`
3. 5-10 dk içinde https://portal.alazimdanismanlik.com açılır.

## 5. Supabase auth ayarı (2 dk)
Supabase → **Authentication → URL Configuration**:
- Site URL: `https://portal.alazimdanismanlik.com`

## 6. Test
1. portal adresini aç → admin mailinle giriş yap
2. Panel açılacak. Başvuru listesi boş — normal, form daha bağlanmadı.
3. Test verisi istersen SQL Editor'de:
   ```sql
   insert into students (first_name,last_name,email,citizenship,lang)
   values ('Test','Talyp','SENIN_MAILIN@gmail.com','Türkmenistan','tk');

   insert into applications (student_id,university,program1,level)
   select id,'İstanbul Medipol Üniversitesi','Diş Hekimliği','lisans' from students limit 1;
   ```
4. Panelde başvuru görünür → durumu "Kabul edildi" yap → **Durumu kaydet + öğrenciye mail** → kendi mailine Türkmence tebrik maili gelmeli 🎉

## Sıradaki adımlar (ben yapacağım)
- Sitedeki `basvuru.html` formunun başvuruları portala da yazması (api/basvuru.js güncellemesi)
- Sitede "Acenta ol / Ekibimize katıl" kayıt sayfası
- Acenta paneli: öğrenci ekleme formu + dosya yükleme
