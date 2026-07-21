// Al Azim Portal — Supabase bağlantı ayarları
// Bu ikisi paylaşılabilir (publishable). SECRET key ASLA buraya yazılmaz!
const SB_URL = "https://gydvyqtynsetictrucfp.supabase.co";
const SB_KEY = "sb_publishable_Vx20zqx6lhowivbJIZQQ0w_54NmBUpN";

const sb = window.supabase.createClient(SB_URL, SB_KEY);

// Durum etiketleri (panelde gösterim)
const STATUS_LABELS = {
  new:             { t: "Yeni",                  c: "#8ab4f8" },
  review:          { t: "İncelemede",            c: "#f8c86a" },
  sent_to_uni:     { t: "Üniversiteye iletildi", c: "#c9a227" },
  accepted:        { t: "Kabul edildi",          c: "#7ee2a8" },
  deposit_pending: { t: "Depozito bekleniyor",   c: "#f2a65a" },
  deposit_paid:    { t: "Depozito ödendi",       c: "#6fd3c7" },
  letter_sent:     { t: "Kabul mektubu gönderildi", c: "#d4af37" },
  rejected:        { t: "Reddedildi",            c: "#f28b82" }
};
