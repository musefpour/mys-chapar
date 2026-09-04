import { OAUTH_LOGO_DATA_URI } from "./oauth-logo-data";

export type OAuthCallbackKind = "success" | "cancelled" | "mismatch";

interface OAuthCallbackCopy {
  title: string;
  body: string;
  status: string;
}

type LocaleMessages = Record<OAuthCallbackKind, OAuthCallbackCopy>;

const EN: LocaleMessages = {
  success: {
    title: "Welcome back",
    body: "You're signed in. This tab can close — MYs Chapar is ready.",
    status: "Opening the app",
  },
  cancelled: {
    title: "Sign in paused",
    body: "Nothing changed. Close this tab and continue in MYs Chapar when you're ready.",
    status: "Waiting for you",
  },
  mismatch: {
    title: "Handoff interrupted",
    body: "The secure link broke mid-way. Close this tab and try again from MYs Chapar.",
    status: "Try again in the app",
  },
};

const MESSAGES: Record<string, LocaleMessages> = {
  en: EN,
  fa: {
    success: {
      title: "خوش آمدید",
      body: "ورود با موفقیت انجام شد. این تب را ببندید و به MYs Chapar برگردید.",
      status: "در حال بازگشت به برنامه",
    },
    cancelled: {
      title: "ورود متوقف شد",
      body: "تغییری اعمال نشد. این تب را ببندید و هر وقت آماده بودید دوباره در MYs Chapar تلاش کنید.",
      status: "منتظر شما",
    },
    mismatch: {
      title: "ارتباط قطع شد",
      body: "لینک امن نیمه‌کاره ماند. این تب را ببندید و از داخل MYs Chapar دوباره وارد شوید.",
      status: "دوباره در برنامه تلاش کنید",
    },
  },
  ar: {
    success: {
      title: "مرحبًا بعودتك",
      body: "تم تسجيل الدخول بنجاح. يمكنك إغلاق هذه العلامة والعودة إلى MYs Chapar.",
      status: "جارٍ فتح التطبيق",
    },
    cancelled: {
      title: "تم إيقاف تسجيل الدخول",
      body: "لم يتغير شيء. أغلق هذه العلامة وحاول مرة أخرى في MYs Chapar عندما تكون جاهزًا.",
      status: "بانتظارك",
    },
    mismatch: {
      title: "انقطع الاتصال الآمن",
      body: "انقطع الرابط الآمن في منتصف الطريق. أغلق هذه العلامة وحاول مرة أخرى من MYs Chapar.",
      status: "حاول مجددًا في التطبيق",
    },
  },
  nl: {
    success: {
      title: "Welkom terug",
      body: "Je bent ingelogd. Je kunt dit tabblad sluiten — MYs Chapar is klaar.",
      status: "App wordt geopend",
    },
    cancelled: {
      title: "Inloggen gepauzeerd",
      body: "Er is niets gewijzigd. Sluit dit tabblad en ga verder in MYs Chapar wanneer je klaar bent.",
      status: "Wachten op jou",
    },
    mismatch: {
      title: "Overdracht onderbroken",
      body: "De beveiligde koppeling is onderbroken. Sluit dit tabblad en probeer opnieuw in MYs Chapar.",
      status: "Opnieuw proberen in de app",
    },
  },
  de: {
    success: {
      title: "Willkommen zurück",
      body: "Du bist angemeldet. Du kannst diesen Tab schließen — MYs Chapar ist bereit.",
      status: "App wird geöffnet",
    },
    cancelled: {
      title: "Anmeldung pausiert",
      body: "Es wurde nichts geändert. Schließe diesen Tab und fahre in MYs Chapar fort, wenn du bereit bist.",
      status: "Warten auf dich",
    },
    mismatch: {
      title: "Übergabe unterbrochen",
      body: "Die sichere Verbindung wurde unterbrochen. Schließe diesen Tab und versuche es erneut in MYs Chapar.",
      status: "In der App erneut versuchen",
    },
  },
  "de-AT": {
    success: {
      title: "Willkommen zurück",
      body: "Du bist angemeldet. Du kannst diesen Tab schließen — MYs Chapar ist bereit.",
      status: "App wird geöffnet",
    },
    cancelled: {
      title: "Anmeldung pausiert",
      body: "Es wurde nichts geändert. Schließe diesen Tab und fahre in MYs Chapar fort, wenn du bereit bist.",
      status: "Warten auf dich",
    },
    mismatch: {
      title: "Übergabe unterbrochen",
      body: "Die sichere Verbindung wurde unterbrochen. Schließe diesen Tab und versuche es erneut in MYs Chapar.",
      status: "In der App erneut versuchen",
    },
  },
  fr: {
    success: {
      title: "Bon retour",
      body: "Vous êtes connecté. Vous pouvez fermer cet onglet — MYs Chapar est prêt.",
      status: "Ouverture de l’application",
    },
    cancelled: {
      title: "Connexion interrompue",
      body: "Rien n’a changé. Fermez cet onglet et continuez dans MYs Chapar quand vous êtes prêt.",
      status: "En attente",
    },
    mismatch: {
      title: "Transfert interrompu",
      body: "Le lien sécurisé s’est interrompu. Fermez cet onglet et réessayez depuis MYs Chapar.",
      status: "Réessayer dans l’application",
    },
  },
  zh: {
    success: {
      title: "欢迎回来",
      body: "登录成功。可以关闭此标签页并返回 MYs Chapar。",
      status: "正在打开应用",
    },
    cancelled: {
      title: "登录已暂停",
      body: "未做任何更改。关闭此标签页，准备好后在 MYs Chapar 中继续。",
      status: "等待中",
    },
    mismatch: {
      title: "安全连接中断",
      body: "安全链接中途失败。关闭此标签页，然后在 MYs Chapar 中重试。",
      status: "请在应用中重试",
    },
  },
  hi: {
    success: {
      title: "वापसी पर स्वागत है",
      body: "आप साइन इन हो गए हैं। यह टैब बंद कर सकते हैं — MYs Chapar तैयार है।",
      status: "ऐप खोला जा रहा है",
    },
    cancelled: {
      title: "साइन इन रोका गया",
      body: "कुछ नहीं बदला। यह टैब बंद करें और तैयार होने पर MYs Chapar में जारी रखें।",
      status: "आपकी प्रतीक्षा में",
    },
    mismatch: {
      title: "कनेक्शन टूट गया",
      body: "सुरक्षित लिंक बीच में टूट गया। यह टैब बंद करें और MYs Chapar से फिर कोशिश करें।",
      status: "ऐप में फिर कोशिश करें",
    },
  },
  es: {
    success: {
      title: "Bienvenido de nuevo",
      body: "Has iniciado sesión. Puedes cerrar esta pestaña — MYs Chapar está listo.",
      status: "Abriendo la app",
    },
    cancelled: {
      title: "Inicio de sesión pausado",
      body: "No cambió nada. Cierra esta pestaña y continúa en MYs Chapar cuando quieras.",
      status: "Esperándote",
    },
    mismatch: {
      title: "Transferencia interrumpida",
      body: "El enlace seguro se interrumpió. Cierra esta pestaña e inténtalo de nuevo en MYs Chapar.",
      status: "Reintentar en la app",
    },
  },
  pt: {
    success: {
      title: "Bem-vindo de volta",
      body: "Você entrou. Pode fechar esta aba — o MYs Chapar está pronto.",
      status: "Abrindo o app",
    },
    cancelled: {
      title: "Login pausado",
      body: "Nada mudou. Feche esta aba e continue no MYs Chapar quando estiver pronto.",
      status: "Aguardando você",
    },
    mismatch: {
      title: "Transferência interrompida",
      body: "O link seguro foi interrompido. Feche esta aba e tente de novo no MYs Chapar.",
      status: "Tentar de novo no app",
    },
  },
  "pt-BR": {
    success: {
      title: "Bem-vindo de volta",
      body: "Você entrou. Pode fechar esta aba — o MYs Chapar está pronto.",
      status: "Abrindo o app",
    },
    cancelled: {
      title: "Login pausado",
      body: "Nada mudou. Feche esta aba e continue no MYs Chapar quando estiver pronto.",
      status: "Aguardando você",
    },
    mismatch: {
      title: "Transferência interrompida",
      body: "O link seguro foi interrompido. Feche esta aba e tente de novo no MYs Chapar.",
      status: "Tentar de novo no app",
    },
  },
  el: {
    success: {
      title: "Καλώς ήρθες ξανά",
      body: "Συνδέθηκες με επιτυχία. Μπορείς να κλείσεις αυτή την καρτέλα — το MYs Chapar είναι έτοιμο.",
      status: "Άνοιγμα της εφαρμογής",
    },
    cancelled: {
      title: "Η σύνδεση διακόπηκε",
      body: "Δεν άλλαξε τίποτα. Κλείσε αυτή την καρτέλα και συνέχισε στο MYs Chapar όταν είσαι έτοιμος.",
      status: "Σε αναμονή",
    },
    mismatch: {
      title: "Η μεταφορά διακόπηκε",
      body: "Ο ασφαλής σύνδεσμος κόπηκε στη μέση. Κλείσε αυτή την καρτέλα και δοκίμασε ξανά από το MYs Chapar.",
      status: "Δοκίμασε ξανά στην εφαρμογή",
    },
  },
  tr: {
    success: {
      title: "Tekrar hoş geldiniz",
      body: "Giriş yaptınız. Bu sekmeyi kapatabilirsiniz — MYs Chapar hazır.",
      status: "Uygulama açılıyor",
    },
    cancelled: {
      title: "Giriş duraklatıldı",
      body: "Hiçbir şey değişmedi. Bu sekmeyi kapatın ve hazır olduğunuzda MYs Chapar’da devam edin.",
      status: "Sizi bekliyor",
    },
    mismatch: {
      title: "Aktarım kesildi",
      body: "Güvenli bağlantı yarıda kaldı. Bu sekmeyi kapatın ve MYs Chapar’dan yeniden deneyin.",
      status: "Uygulamada yeniden deneyin",
    },
  },
  ru: {
    success: {
      title: "С возвращением",
      body: "Вы вошли в аккаунт. Можно закрыть эту вкладку — MYs Chapar готов.",
      status: "Открытие приложения",
    },
    cancelled: {
      title: "Вход приостановлен",
      body: "Ничего не изменилось. Закройте эту вкладку и продолжите в MYs Chapar, когда будете готовы.",
      status: "Ожидание",
    },
    mismatch: {
      title: "Передача прервана",
      body: "Безопасная ссылка оборвалась. Закройте эту вкладку и попробуйте снова в MYs Chapar.",
      status: "Повторите в приложении",
    },
  },
  da: {
    success: {
      title: "Velkommen tilbage",
      body: "Du er logget ind. Du kan lukke denne fane — MYs Chapar er klar.",
      status: "Åbner appen",
    },
    cancelled: {
      title: "Login sat på pause",
      body: "Intet er ændret. Luk denne fane, og fortsæt i MYs Chapar, når du er klar.",
      status: "Venter på dig",
    },
    mismatch: {
      title: "Overførsel afbrudt",
      body: "Det sikre link blev afbrudt. Luk denne fane, og prøv igen fra MYs Chapar.",
      status: "Prøv igen i appen",
    },
  },
};

const RTL_LOCALES = new Set(["ar", "fa"]);

function resolveLocale(raw?: string): string {
  const value = (raw ?? "en").trim().replace(/_/g, "-");
  if (!value) return "en";
  if (MESSAGES[value]) return value;
  const lower = value.toLowerCase();
  if (MESSAGES[lower]) return lower;
  // e.g. fa-IR → fa, de-AT stays exact when present
  const base = lower.split("-")[0];
  if (base && MESSAGES[base]) return base;
  for (const key of Object.keys(MESSAGES)) {
    if (key.toLowerCase() === lower || key.toLowerCase() === base) return key;
  }
  return "en";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function oauthCallbackPage(kind: OAuthCallbackKind, localeRaw?: string): string {
  const locale = resolveLocale(localeRaw);
  const copy = MESSAGES[locale]?.[kind] ?? EN[kind];
  const rtl = RTL_LOCALES.has(locale);
  const tone = kind === "success" ? "ok" : kind === "cancelled" ? "warn" : "err";
  const fontLink = rtl
    ? "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
    : "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap";
  const bodyFont = rtl
    ? '"Vazirmatn", "Segoe UI", Tahoma, sans-serif'
    : 'Outfit, "Segoe UI", sans-serif';

  return `<!doctype html>
<html lang="${escapeHtml(locale)}" dir="${rtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeHtml(copy.title)} · MYs Chapar</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${fontLink}" rel="stylesheet" />
  <style>
    :root {
      --ink: #14282c;
      --ink-soft: #3d565c;
      --muted: #6a8288;
      --firouzeh: #0e857e;
      --firouzeh-bright: #19a89f;
      --deep: #0a4f4a;
      --lapis: #1e3a5f;
      --gold: #c4a35a;
      --gold-soft: #e4d2a0;
      --paper: #eef4f1;
      --fog: #f7faf8;
      --tone: ${tone === "ok" ? "#0e857e" : tone === "warn" ? "#b8923f" : "#b54747"};
      --tone-soft: ${tone === "ok" ? "rgba(14,133,126,.16)" : tone === "warn" ? "rgba(184,146,63,.18)" : "rgba(181,71,71,.16)"};
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #e8f5f1;
        --ink-soft: #b7d0c8;
        --muted: #7fa099;
        --firouzeh: #3dccb4;
        --firouzeh-bright: #5ee0c9;
        --deep: #0d2a25;
        --paper: #071210;
        --fog: #0b1916;
        --tone: ${tone === "ok" ? "#3dccb4" : tone === "warn" ? "#d4a85a" : "#e07070"};
        --tone-soft: ${tone === "ok" ? "rgba(61,204,180,.18)" : tone === "warn" ? "rgba(212,168,90,.18)" : "rgba(224,112,112,.18)"};
      }
    }
    * { box-sizing: border-box; margin: 0; }
    html, body { min-height: 100%; }
    body {
      font-family: ${bodyFont};
      color: var(--ink);
      background: var(--fog);
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .stage {
      position: relative;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: clamp(1.5rem, 4vw, 3rem);
      isolation: isolate;
    }
    .aurora {
      position: absolute;
      inset: -20%;
      z-index: -2;
      background:
        radial-gradient(ellipse 55% 45% at 18% 22%, color-mix(in srgb, var(--firouzeh) 28%, transparent), transparent 60%),
        radial-gradient(ellipse 50% 40% at 82% 18%, color-mix(in srgb, var(--gold) 22%, transparent), transparent 58%),
        radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in srgb, var(--lapis) 16%, transparent), transparent 55%),
        linear-gradient(165deg, var(--fog), var(--paper) 55%, color-mix(in srgb, var(--firouzeh) 8%, var(--paper)));
      animation: drift 14s ease-in-out infinite alternate;
    }
    @media (prefers-color-scheme: dark) {
      .aurora {
        background:
          radial-gradient(ellipse 55% 45% at 15% 20%, color-mix(in srgb, #3dccb4 26%, transparent), transparent 58%),
          radial-gradient(ellipse 48% 38% at 85% 15%, color-mix(in srgb, var(--gold) 14%, transparent), transparent 55%),
          radial-gradient(ellipse 70% 55% at 50% 110%, color-mix(in srgb, #1fa892 18%, transparent), transparent 58%),
          linear-gradient(180deg, #10221d, #081210 70%);
      }
    }
    .mesh {
      position: absolute;
      inset: 0;
      z-index: -1;
      opacity: 0.45;
      background-image:
        linear-gradient(color-mix(in srgb, var(--ink) 4%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--ink) 4%, transparent) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, #000 20%, transparent 75%);
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.55;
      z-index: -1;
      pointer-events: none;
    }
    .orb-a {
      width: 18rem; height: 18rem;
      left: 8%; top: 18%;
      background: color-mix(in srgb, var(--firouzeh) 35%, transparent);
      animation: float 9s ease-in-out infinite;
    }
    .orb-b {
      width: 14rem; height: 14rem;
      right: 10%; bottom: 16%;
      background: color-mix(in srgb, var(--gold) 30%, transparent);
      animation: float 11s ease-in-out infinite reverse;
    }
    .arc {
      position: absolute;
      inset: 12% 10%;
      z-index: -1;
      border: 1px solid color-mix(in srgb, var(--gold) 28%, transparent);
      border-radius: 50%;
      opacity: 0.35;
      transform: rotate(-12deg);
      pointer-events: none;
      animation: spinArc 40s linear infinite;
    }
    .arc::before {
      content: "";
      position: absolute;
      inset: 8%;
      border: 1px solid color-mix(in srgb, var(--firouzeh) 22%, transparent);
      border-radius: 50%;
      border-bottom-color: transparent;
      border-left-color: transparent;
    }
    .compose {
      width: min(100%, 34rem);
      text-align: center;
      animation: reveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .logo-wrap {
      position: relative;
      width: 6.5rem;
      height: 6.5rem;
      margin: 0 auto 1.6rem;
      animation: logoIn 1s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .logo-wrap::before {
      content: "";
      position: absolute;
      inset: -18%;
      border-radius: 32%;
      background: radial-gradient(circle, var(--tone-soft), transparent 70%);
      animation: pulseGlow 2.8s ease-in-out infinite;
    }
    .logo-wrap img {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 1.35rem;
      object-fit: cover;
      box-shadow:
        0 1px 2px color-mix(in srgb, var(--deep) 12%, transparent),
        0 18px 40px color-mix(in srgb, var(--lapis) 14%, transparent),
        0 0 0 1px color-mix(in srgb, var(--gold) 24%, transparent);
    }
    .brand {
      font-family: "Instrument Serif", Georgia, serif;
      font-size: clamp(2.6rem, 7vw, 3.6rem);
      font-weight: 400;
      letter-spacing: -0.03em;
      line-height: 0.95;
      color: var(--ink);
      margin-bottom: 1.75rem;
      animation: reveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
    }
    .brand em {
      font-style: italic;
      background: linear-gradient(120deg, var(--firouzeh), var(--gold));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .rule {
      width: 3.5rem;
      height: 2px;
      margin: 0 auto 1.5rem;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, var(--gold), var(--firouzeh), transparent);
      animation: reveal 0.8s ease 0.18s both;
    }
    .status-icon {
      width: 3.25rem;
      height: 3.25rem;
      margin: 0 auto 1.15rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--tone) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--tone) 28%, transparent);
      animation: pop 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.28s both;
    }
    .status-icon svg {
      width: 1.45rem;
      height: 1.45rem;
      stroke: var(--tone);
      fill: none;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .status-icon .check {
      stroke-dasharray: 36;
      stroke-dashoffset: 36;
      animation: draw 0.7s ease 0.45s forwards;
    }
    h1 {
      font-size: clamp(1.35rem, 3.2vw, 1.7rem);
      font-weight: 600;
      letter-spacing: ${rtl ? "0" : "-0.03em"};
      margin-bottom: 0.55rem;
      animation: reveal 0.8s ease 0.32s both;
    }
    .body {
      max-width: 26rem;
      margin: 0 auto;
      color: var(--ink-soft);
      font-size: 1.02rem;
      line-height: 1.65;
      font-weight: 450;
      animation: reveal 0.8s ease 0.4s both;
    }
    .footer {
      margin-top: 2.1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.7rem;
      animation: reveal 0.8s ease 0.5s both;
    }
    .footer span {
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: ${rtl ? "0" : "0.08em"};
      text-transform: ${rtl ? "none" : "uppercase"};
      color: var(--muted);
    }
    .bar {
      width: min(12rem, 50vw);
      height: 2px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--tone) 14%, transparent);
      overflow: hidden;
    }
    .bar i {
      display: block;
      height: 100%;
      width: 40%;
      border-radius: inherit;
      background: linear-gradient(90deg, transparent, var(--tone), transparent);
      animation: slide 1.4s ease-in-out infinite;
    }
    @keyframes reveal {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes logoIn {
      from { opacity: 0; transform: translateY(24px) scale(0.92); }
      to { opacity: 1; transform: none; }
    }
    @keyframes pop {
      from { opacity: 0; transform: scale(0.7); }
      to { opacity: 1; transform: none; }
    }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes slide {
      from { transform: translateX(${rtl ? "120%" : "-120%"}); }
      to { transform: translateX(${rtl ? "-280%" : "280%"}); }
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.06); }
    }
    @keyframes float {
      from { transform: translateY(0); }
      to { transform: translateY(-18px); }
    }
    @keyframes drift {
      from { transform: scale(1) translate(0, 0); }
      to { transform: scale(1.05) translate(-1.5%, 1%); }
    }
    @keyframes spinArc {
      from { transform: rotate(-12deg); }
      to { transform: rotate(348deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .aurora, .orb, .arc, .compose, .logo-wrap, .brand, .rule,
      .status-icon, h1, .body, .footer, .bar i, .logo-wrap::before,
      .status-icon .check { animation: none !important; }
      .status-icon .check { stroke-dashoffset: 0; }
    }
  </style>
</head>
<body>
  <div class="stage">
    <div class="aurora" aria-hidden="true"></div>
    <div class="mesh" aria-hidden="true"></div>
    <div class="orb orb-a" aria-hidden="true"></div>
    <div class="orb orb-b" aria-hidden="true"></div>
    <div class="arc" aria-hidden="true"></div>

    <main class="compose" role="status">
      <div class="logo-wrap">
        <img src="${OAUTH_LOGO_DATA_URI}" width="120" height="120" alt="" />
      </div>
      <p class="brand">MYs <em>Chapar</em></p>
      <div class="rule" aria-hidden="true"></div>
      <div class="status-icon" aria-hidden="true">
        ${
          tone === "ok"
            ? `<svg viewBox="0 0 24 24"><path class="check" d="M5 13.2 9.8 18 19 7"/></svg>`
            : tone === "warn"
              ? `<svg viewBox="0 0 24 24"><path d="M8 8l8 8M16 8l-8 8"/></svg>`
              : `<svg viewBox="0 0 24 24"><path d="M12 7v7"/><circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none"/></svg>`
        }
      </div>
      <h1>${escapeHtml(copy.title)}</h1>
      <p class="body">${escapeHtml(copy.body)}</p>
      <div class="footer">
        <span>${escapeHtml(copy.status)}</span>
        <div class="bar" aria-hidden="true"><i></i></div>
      </div>
    </main>
  </div>
  <script>
    setTimeout(function () {
      try { window.close(); } catch (_) {}
    }, 2200);
  </script>
</body>
</html>`;
}
