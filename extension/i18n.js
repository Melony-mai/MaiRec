/**
 * MaiRec Multilingual Internationalization (i18n) Module
 * Supports 3 languages: English, Japanese, and Simplified Chinese.
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Simplified Chinese", nativeName: "简体中文" }
];

export const translations = {
  "en": {
    "appName": "MaiRec",
    "appDescription": "❗❗IF IT DOESN’T WORK AFTER INSTALLATION – RESTART YOUR BROWSER❗❗\nMaiRec automatically solves reCAPTCHA by selecting and clicking on images — the entire solution is processed by an on-device neural network directly inside the extension.\n\nFeatures:\n - Solves reCAPTCHA V2 / V2 Invisible / Enterprise\n - Free and open source\n - No API key needed, no payments required\n - Neural network runs locally on CPU via ONNX WebAssembly\n - Works offline with zero cloud inference dependency\n - No registration required, works right after installation\n\nUsage details:\n - On startup, it may pause for 5–15 seconds while initializing AI models\n - Understands English, and automatically switches reCAPTCHA to English\n - In settings, you can enable/disable the solver\n - Customizable delays between clicks and before verification\n - Optional WebSocket worker mode for distributed automation",
    "actionTitle": "Open MaiRec",
    "language": "Language",
    "solver_enabled": "Solver enabled",
    "recaptcha_support": "reCAPTCHA support",
    "autoclick_buttons": "Auto-click buttons",
    "solve_images": "Solve image challenges",
    "ws_mode": "WS mode",
    "ws_mode_tooltip": "Requires a 32-character API key",
    "help_local_models": "Models run locally, no data is sent outside.",
    "btn_timeouts": "Timeouts",
    "btn_reports": "Reports",
    "btn_back": "← Back",
    "reports_title": "Reports",
    "enable_reports": "Enable reports (disabled)",
    "rep_key_label_16": "API key (16 chars)",
    "rep_key_label_16_32": "API key (16 or 32 chars)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Send reports",
    "status_uploads_disabled": "Data uploads are disabled.",
    "status_last_sent": "Last report sent: ",
    "status_last_error": "Last error: ",
    "timeouts_title": "Timeouts",
    "timeouts_title_ms": "Timeouts (ms)",
    "timeout_between_clicks": "Between tile clicks",
    "timeout_dynamic_reveal": "Dynamic reveal → click",
    "timeout_verify": "Last click → verify",
    "unit_ms": "ms",
    "help_timeouts": "A random 0–300 ms is added to each timeout. Dynamic reveal counts recognition time already spent.",
    "section_solver": "Solver Settings",
    "section_timeout_report": "Timeout Settings / Report",
    "theme": "Theme",
    "theme_dark": "Dark",
    "theme_light": "Light",
    "theme_toggle_to_light": "Switch to light mode",
    "theme_toggle_to_dark": "Switch to dark mode"
  },
  "ja": {
    "appName": "MaiRec",
    "appDescription": "❗❗インストール後に動かない場合 – ブラウザを再起動してください❗❗\nMaiRec は、画像を選択してクリックすることで reCAPTCHA を自動で解決します — 処理はすべて拡張機能内蔵のローカルニューラルネットワークで行われます。\n\n機能：\n - reCAPTCHA V2 / V2 Invisible / Enterprise に対応\n - 無料＆オープンソース\n - API キー不要、支払い不要\n - 拡張機能内のニューラルネットは ONNX WebAssembly により CPU 上で動作\n - クラウド推論に依存せずローカルで完結\n - 登録不要、インストール後すぐに利用可能\n\n使用の詳細：\n - 起動時に AI モデルを読み込むため 5〜15 秒間停止することがあります\n - 英語のみ理解するため、reCAPTCHA を自動的に英語に切り替えます\n - 設定内で、ソルバーを有効／無効にできます\n - 画像をクリックする前の遅延をカスタマイズ可能\n - 分散自動化のためのオプションの WebSocket ワーカーモードに対応",
    "actionTitle": "MaiRec を開く",
    "language": "言語",
    "solver_enabled": "ソルバー有効",
    "recaptcha_support": "reCAPTCHAサポート",
    "autoclick_buttons": "ボタンの自動クリック",
    "solve_images": "画像認証を解決",
    "ws_mode": "WSモード",
    "ws_mode_tooltip": "32文字のAPIキーが必要です",
    "help_local_models": "モデルはローカルで実行され、外部にデータは送信されません。",
    "btn_timeouts": "タイムアウト",
    "btn_reports": "レポート",
    "btn_back": "← 戻る",
    "reports_title": "レポート",
    "enable_reports": "レポートを有効化（無効）",
    "rep_key_label_16": "APIキー（16文字）",
    "rep_key_label_16_32": "APIキー（16または32文字）",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "レポートを送信",
    "status_uploads_disabled": "データのアップロードは無効です。",
    "status_last_sent": "最終レポート送信: ",
    "status_last_error": "最後のエラー: ",
    "timeouts_title": "タイムアウト",
    "timeouts_title_ms": "タイムアウト (ms)",
    "timeout_between_clicks": "タイルのクリック間隔",
    "timeout_dynamic_reveal": "動的表示 → クリック",
    "timeout_verify": "最後のクリック → 確認",
    "unit_ms": "ms",
    "help_timeouts": "各タイムアウトにランダムで 0〜300 ms が追加されます。動的表示はすでに費やされた認識時間をカウントします。",
    "section_solver": "ソルバー設定",
    "section_timeout_report": "タイムアウト設定 / レポート",
    "theme": "テーマ",
    "theme_dark": "ダーク",
    "theme_light": "ライト",
    "theme_toggle_to_light": "ライトモードに切り替え",
    "theme_toggle_to_dark": "ダークモードに切り替え"
  },
  "zh": {
    "appName": "MaiRec",
    "appDescription": "❗❗如果安装后无效 – 请重启浏览器❗❗\nMaiRec 通过选择并点击图片自动解决 reCAPTCHA — 整个过程由扩展内置的本地神经网络处理。\n\n功能：\n - 支持 reCAPTCHA V2 / V2 隐形 / Enterprise\n - 免费且开源\n - 无需 API 密钥，也无需付款\n - 扩展内的神经网络通过 ONNX WebAssembly 在 CPU 本地运行\n - 零云端依赖，离线推理\n - 无需注册，安装后即可使用\n\n使用说明：\n - 启动时可能会暂停 5–15 秒以加载 AI 模型\n - 仅识别英文，因此会自动将 reCAPTCHA 切换为英文\n - 在设置中，你可以启用/禁用求解器\n - 支持自定义图块点击间隔与验证延迟\n - 支持可选的 WebSocket 工作节点模式以配合分布式自动化",
    "actionTitle": "打开 MaiRec",
    "language": "语言",
    "solver_enabled": "已启用求解器",
    "recaptcha_support": "reCAPTCHA 支持",
    "autoclick_buttons": "自动点击按钮",
    "solve_images": "解决图片挑战",
    "ws_mode": "WS 模式",
    "ws_mode_tooltip": "需要 32 位字符的 API 密钥",
    "help_local_models": "模型在本地运行，不会向外发送任何数据。",
    "btn_timeouts": "超时设置",
    "btn_reports": "报告",
    "btn_back": "← 返回",
    "reports_title": "报告",
    "enable_reports": "启用报告（已禁用）",
    "rep_key_label_16": "API 密钥（16 位字符）",
    "rep_key_label_16_32": "API 密钥（16 或 32 位字符）",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "发送报告",
    "status_uploads_disabled": "数据上传已禁用。",
    "status_last_sent": "最后发送的报告: ",
    "status_last_error": "最后错误: ",
    "timeouts_title": "超时",
    "timeouts_title_ms": "超时（毫秒）",
    "timeout_between_clicks": "图块点击间隔",
    "timeout_dynamic_reveal": "动态出现 → 点击",
    "timeout_verify": "最后点击 → 验证",
    "unit_ms": "毫秒",
    "help_timeouts": "每个超时时间都会随机增加 0–300 毫秒。动态出现会计算已消耗的识别时间。",
    "section_solver": "求解器设置",
    "section_timeout_report": "超时设置 / 报告",
    "theme": "主题",
    "theme_dark": "深色",
    "theme_light": "浅色",
    "theme_toggle_to_light": "切换到浅色模式",
    "theme_toggle_to_dark": "切换到深色模式"
  }
};

export function normalizeLanguage(lang) {
  if (!lang || typeof lang !== "string") return "en";
  const clean = lang.toLowerCase().trim();
  if (translations[clean]) return clean;
  const prefix = clean.split(/[-_]/)[0];
  if (translations[prefix]) return prefix;
  return "en";
}

export function getMessage(key, lang = "en") {
  const norm = normalizeLanguage(lang);
  if (translations[norm] && translations[norm][key] !== undefined) {
    return translations[norm][key];
  }
  if (translations.en && translations.en[key] !== undefined) {
    return translations.en[key];
  }
  if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return key;
}

export function applyTranslations(lang, root = document) {
  const norm = normalizeLanguage(lang);
  if (typeof document !== "undefined") {
    document.documentElement.lang = norm;
    document.documentElement.dir = "ltr";
  }
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = getMessage(key, norm);
    }
  });

  const titleEls = root.querySelectorAll("[data-i18n-title]");
  titleEls.forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (key) {
      el.title = getMessage(key, norm);
    }
  });

  const phEls = root.querySelectorAll("[data-i18n-placeholder]");
  phEls.forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      el.placeholder = getMessage(key, norm);
    }
  });

  const ariaEls = root.querySelectorAll("[data-i18n-aria-label]");
  ariaEls.forEach(el => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) {
      el.setAttribute("aria-label", getMessage(key, norm));
    }
  });

  return norm;
}

export async function getStoredLanguage() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(["language", "settings"]);
      if (res?.language) return normalizeLanguage(res.language);
      if (res?.settings?.language) return normalizeLanguage(res.settings.language);
    }
  } catch {}
  if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
    return normalizeLanguage(chrome.i18n.getUILanguage());
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return normalizeLanguage(navigator.language);
  }
  return "en";
}

export async function setStoredLanguage(lang) {
  const norm = normalizeLanguage(lang);
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ language: norm });
    }
  } catch {}
  return norm;
}
