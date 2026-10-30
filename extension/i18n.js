/**
 * MaiRec Multilingual Internationalization (i18n) Module
 * Supports 11 languages: English, Arabic, German, Spanish, French,
 * Indonesian, Japanese, Malay, Portuguese, Russian, and Simplified Chinese.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Simplified Chinese', nativeName: '简体中文' }
];

export const translations = {
  "ar": {
    "appName": "MaiRec",
    "appDescription": "❗❗إذا لم يعمل بعد التثبيت – أعد تشغيل المتصفح❗❗\nيقوم الملحق تلقائيًا بحل reCAPTCHA من خلال اختيار والنقر على الصور — تتم العملية بالكامل بواسطة شبكة عصبية مدمجة داخل الملحق.\n\nالميزات:\n - يحل reCAPTCHA V2 / V2 Invisible / Enterprise\n - مجاني\n - لا يحتاج مفتاح API أو دفع\n - الشبكة العصبية داخل الإضافة تعمل على المعالج (CPU)\n - يمكن أن يعمل دون اتصال (لكن كيف ستحمّل reCAPTCHA؟)\n - لا يتطلب تسجيل، يعمل فور التثبيت\n\nتفاصيل الاستخدام:\n - عند بدء التشغيل قد يتوقف لمدة 5–15 ثانية أثناء تحميل نماذج الذكاء الاصطناعي\n - يفهم الإنجليزية فقط، لذا يبدّل reCAPTCHA إلى الإنجليزية تلقائيًا\n - في الإعدادات، يمكنك تفعيل/تعطيل الإضافة\n - يمكنك ضبط تأخير قبل النقر على الصورة\n - الإضافة ترسل تقارير إلى captcharaptor\n - التقارير تحتوي على الصور التي واجهتها\n\nالعيوب الحالية:\n - أحيانًا يرتكب أخطاء\n - لا يرسل النموذج تلقائيًا بعد حل الكابتشا\n\nهذه هي النسخة العامة الأولى من الإضافة. سجّل على captchaplugin.com للحصول على نسخ أقوى أو أسرع. لكن التسجيل ليس ضروريًا لعمل هذه النسخة.",
    "actionTitle": "افتح MaiRec",
    "language": "اللغة",
    "solver_enabled": "تمكين الحلّال",
    "recaptcha_support": "دعم reCAPTCHA",
    "autoclick_buttons": "النقر التلقائي على الأزرار",
    "solve_images": "حل تحديات الصور",
    "ws_mode": "وضع WS",
    "ws_mode_tooltip": "يتطلب مفتاح API بطول 32 حرفًا",
    "help_local_models": "النماذج تعمل محليًا، ولا يتم إرسال أي بيانات إلى الخارج.",
    "btn_timeouts": "المهلات",
    "btn_reports": "التقارير",
    "visit_website": "زيارة captchaplugin.com",
    "btn_back": "← رجوع",
    "reports_title": "التقارير",
    "enable_reports": "تفعيل التقارير (معطل)",
    "rep_key_label_16": "مفتاح API (16 حرفًا)",
    "rep_key_label_16_32": "مفتاح API (16 أو 32 حرفًا)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "إرسال التقارير",
    "status_uploads_disabled": "تم تعطيل تحميل البيانات.",
    "status_last_sent": "آخر تقرير تم إرساله: ",
    "status_last_error": "آخر خطأ: ",
    "timeouts_title": "المهلات",
    "timeouts_title_ms": "المهلات (مللي ثانية)",
    "timeout_between_clicks": "بين النقرات على المربعات",
    "timeout_dynamic_reveal": "الظهور الديناميكي ← النقر",
    "timeout_verify": "آخر نقرة ← التحقق",
    "unit_ms": "مللي ثانية",
    "help_timeouts": "يتم إضافة 0–300 مللي ثانية عشوائيًا إلى كل مهلة. يحتسب الظهور الديناميكي وقت التعرف المنقضي بالفعل."
  },
  "de": {
    "appName": "MaiRec",
    "appDescription": "❗❗WENN ES NACH DER INSTALLATION NICHT FUNKTIONIERT – STARTE DEINEN BROWSER NEU❗❗\nDas Plugin löst reCAPTCHA automatisch, indem es Bilder auswählt und anklickt — die gesamte Lösung wird direkt im Plugin von einem neuronalen Netzwerk verarbeitet.\n\nFunktionen:\n - Löst reCAPTCHA V2 / V2 Invisible / Enterprise\n - Kostenlos\n - Kein API-Schlüssel erforderlich, keine Zahlungen nötig\n - Das neuronale Netzwerk innerhalb der Erweiterung läuft auf der CPU\n - Kann offline arbeiten (aber wie lädst du reCAPTCHA?)\n - Keine Registrierung erforderlich, funktioniert sofort nach der Installation\n\nDetails zur Nutzung:\n - Beim Start kann es 5–15 Sekunden pausieren, während KI-Modelle geladen werden\n - Versteht nur Englisch, daher wechselt es reCAPTCHA automatisch ins Englische\n - In den Einstellungen kannst du das Plugin aktivieren/deaktivieren\n - Du kannst eine Verzögerung vor dem Klicken auf ein Bild einstellen\n - Das Plugin sendet Berichte an captcharaptor\n - Die Berichte enthalten die Bilder, denen es begegnet ist\n\nDerzeitige Nachteile:\n - Macht manchmal Fehler\n - Sendet das Formular nicht automatisch nach der Lösung des Captchas\n\nDies ist die erste öffentliche Version des Plugins. Registriere dich auf captchaplugin.com, um leistungsstärkere oder schnellere Versionen zu erhalten. Aber eine Registrierung ist nicht erforderlich, damit diese Version funktioniert.",
    "actionTitle": "MaiRec öffnen",
    "language": "Sprache",
    "solver_enabled": "Solver aktiviert",
    "recaptcha_support": "reCAPTCHA-Unterstützung",
    "autoclick_buttons": "Schaltflächen automatisch klicken",
    "solve_images": "Bild-Aufgaben lösen",
    "ws_mode": "WS-Modus",
    "ws_mode_tooltip": "Erfordert einen 32-stelligen API-Schlüssel",
    "help_local_models": "Modelle laufen lokal, es werden keine Daten nach außen gesendet.",
    "btn_timeouts": "Timeouts",
    "btn_reports": "Berichte",
    "visit_website": "captchaplugin.com besuchen",
    "btn_back": "← Zurück",
    "reports_title": "Berichte",
    "enable_reports": "Berichte aktivieren (deaktiviert)",
    "rep_key_label_16": "API-Schlüssel (16 Zeichen)",
    "rep_key_label_16_32": "API-Schlüssel (16 oder 32 Zeichen)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Berichte senden",
    "status_uploads_disabled": "Daten-Uploads sind deaktiviert.",
    "status_last_sent": "Letzter Bericht gesendet: ",
    "status_last_error": "Letzter Fehler: ",
    "timeouts_title": "Timeouts",
    "timeouts_title_ms": "Timeouts (ms)",
    "timeout_between_clicks": "Zwischen Kachelschritten",
    "timeout_dynamic_reveal": "Dynamisches Einblenden → Klick",
    "timeout_verify": "Letzter Klick → Bestätigen",
    "unit_ms": "ms",
    "help_timeouts": "Jedem Timeout werden zufällig 0–300 ms hinzugefügt. Das dynamische Einblenden zählt die bereits verstrichene Erkennungszeit mit."
  },
  "en": {
    "appName": "MaiRec",
    "appDescription": "❗❗IF IT DOESN’T WORK AFTER INSTALLATION – RESTART YOUR BROWSER❗❗\nThe plugin automatically solves reCAPTCHA by selecting and clicking on images — the entire solution is processed by a neural network directly inside the plugin.\n\nFeatures:\n - Solves reCAPTCHA V2 / V2 Invisible / Enterprise\n - Free\n - No API key needed, no payments required\n - The neural network inside the extension runs on CPU\n - Can work offline (but how will you load the reCAPTCHA?)\n - No registration required, works right after installation\n\nUsage details:\n - On startup, it may pause for 5–15 seconds while loading AI models\n - Understands only English, so it automatically switches reCAPTCHA to English\n - In settings, you can enable/disable the plugin\n - You can set a delay before clicking on an image\n - The plugin sends reports to captcharaptor\n - Reports contain the images it encountered\n\nCurrent drawbacks:\n - Sometimes makes mistakes\n - Does not submit the form automatically after solving the captcha\n\nThis is the first public version of the plugin. Register at captchaplugin.com to get more powerful or faster versions. But registration is not required for this version to work.",
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
    "visit_website": "Visit captchaplugin.com",
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
    "help_timeouts": "A random 0–300 ms is added to each timeout. Dynamic reveal counts recognition time already spent."
  },
  "es": {
    "appName": "MaiRec",
    "appDescription": "❗❗SI NO FUNCIONA DESPUÉS DE LA INSTALACIÓN – REINICIA TU NAVEGADOR❗❗\nEl complemento resuelve automáticamente reCAPTCHA seleccionando y haciendo clic en las imágenes: toda la solución es procesada por una red neuronal directamente dentro del complemento.\n\nCaracterísticas:\n - Resuelve reCAPTCHA V2 / V2 Invisible / Enterprise\n - Gratis\n - No se necesita clave API, no se requieren pagos\n - La red neuronal dentro de la extensión se ejecuta en la CPU\n - Puede funcionar sin conexión (¿pero cómo cargarás el reCAPTCHA?)\n - No requiere registro, funciona justo después de la instalación\n\nDetalles de uso:\n - Al iniciar, puede tardar entre 5 y 15 segundos mientras se cargan los modelos de IA\n - Solo entiende inglés, por lo que cambia automáticamente reCAPTCHA al inglés\n - En la configuración puedes habilitar/deshabilitar el complemento\n - Puedes establecer un retraso antes de hacer clic en una imagen\n - El complemento envía informes a captcharaptor\n - Los informes contienen las imágenes que encontró\n\nLimitaciones actuales:\n - A veces comete errores\n - No envía el formulario automáticamente después de resolver el captcha\n\nEsta es la primera versión pública del complemento. Regístrate en captchaplugin.com para obtener versiones más potentes o rápidas. Pero el registro no es necesario para que esta versión funcione.",
    "actionTitle": "Abrir MaiRec",
    "language": "Idioma",
    "solver_enabled": "Solucionador activado",
    "recaptcha_support": "Soporte para reCAPTCHA",
    "autoclick_buttons": "Hacer clic automático en botones",
    "solve_images": "Resolver desafíos de imágenes",
    "ws_mode": "Modo WS",
    "ws_mode_tooltip": "Requiere una clave de API de 32 caracteres",
    "help_local_models": "Los modelos se ejecutan localmente, no se envían datos al exterior.",
    "btn_timeouts": "Tiempos de espera",
    "btn_reports": "Informes",
    "visit_website": "Visitar captchaplugin.com",
    "btn_back": "← Atrás",
    "reports_title": "Informes",
    "enable_reports": "Habilitar informes (desactivado)",
    "rep_key_label_16": "Clave API (16 caracteres)",
    "rep_key_label_16_32": "Clave API (16 o 32 caracteres)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Enviar informes",
    "status_uploads_disabled": "La subida de datos está deshabilitada.",
    "status_last_sent": "Último informe enviado: ",
    "status_last_error": "Último error: ",
    "timeouts_title": "Tiempos de espera",
    "timeouts_title_ms": "Tiempos de espera (ms)",
    "timeout_between_clicks": "Entre clics de casilla",
    "timeout_dynamic_reveal": "Aparición dinámica → clic",
    "timeout_verify": "Último clic → verificar",
    "unit_ms": "ms",
    "help_timeouts": "Se añade un tiempo aleatorio de 0–300 ms a cada tiempo de espera. La aparición dinámica cuenta el tiempo de reconocimiento ya empleado."
  },
  "fr": {
    "appName": "MaiRec",
    "appDescription": "❗❗SI CELA NE FONCTIONNE PAS APRÈS L’INSTALLATION – REDÉMARREZ VOTRE NAVIGATEUR❗❗\nLe plugin résout automatiquement reCAPTCHA en sélectionnant et en cliquant sur les images — toute la solution est traitée par un réseau neuronal intégré directement dans le plugin.\n\nFonctionnalités :\n - Résout reCAPTCHA V2 / V2 Invisible / Enterprise\n - Gratuit\n - Aucune clé API nécessaire, aucun paiement requis\n - Le réseau neuronal dans l’extension fonctionne sur le CPU\n - Peut fonctionner hors ligne (mais comment chargerez-vous le reCAPTCHA ?)\n - Aucune inscription requise, fonctionne dès l’installation\n\nDétails d’utilisation :\n - Au démarrage, il peut se mettre en pause pendant 5 à 15 secondes pendant le chargement des modèles IA\n - Comprend seulement l’anglais, il bascule donc automatiquement reCAPTCHA en anglais\n - Dans les paramètres, vous pouvez activer / désactiver le plugin\n - Vous pouvez définir un délai avant de cliquer sur une image\n - Le plugin envoie des rapports vers captcharaptor\n - Les rapports contiennent les images rencontrées\n\nInconvénients actuels :\n - Parfois fait des erreurs\n - Ne soumet pas automatiquement le formulaire après avoir résolu le captcha\n\nCeci est la première version publique du plugin. Inscrivez-vous sur captchaplugin.com pour obtenir des versions plus puissantes ou plus rapides. Mais l’inscription n’est pas nécessaire pour que cette version fonctionne.",
    "actionTitle": "Ouvrir MaiRec",
    "language": "Langue",
    "solver_enabled": "Solveur activé",
    "recaptcha_support": "Prise en charge de reCAPTCHA",
    "autoclick_buttons": "Clic automatique sur les boutons",
    "solve_images": "Résoudre les défis d'images",
    "ws_mode": "Mode WS",
    "ws_mode_tooltip": "Nécessite une clé API de 32 caractères",
    "help_local_models": "Les modèles fonctionnent localement, aucune donnée n'est envoyée à l'extérieur.",
    "btn_timeouts": "Délais",
    "btn_reports": "Rapports",
    "visit_website": "Visiter captchaplugin.com",
    "btn_back": "← Retour",
    "reports_title": "Rapports",
    "enable_reports": "Activer les rapports (désactivé)",
    "rep_key_label_16": "Clé API (16 caractères)",
    "rep_key_label_16_32": "Clé API (16 ou 32 caractères)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Envoyer les rapports",
    "status_uploads_disabled": "Les téléversements de données sont désactivés.",
    "status_last_sent": "Dernier rapport envoyé : ",
    "status_last_error": "Dernière erreur : ",
    "timeouts_title": "Délais",
    "timeouts_title_ms": "Délais (ms)",
    "timeout_between_clicks": "Entre les clics sur les tuiles",
    "timeout_dynamic_reveal": "Révélation dynamique → clic",
    "timeout_verify": "Dernier clic → vérifier",
    "unit_ms": "ms",
    "help_timeouts": "Un délai aléatoire de 0 à 300 ms est ajouté à chaque délai. La révélation dynamique prend en compte le temps de reconnaissance déjà écoulé."
  },
  "id": {
    "appName": "MaiRec",
    "appDescription": "❗❗JIKA TIDAK BERFUNGSI SETELAH INSTALASI – MUAT ULANG PERAMBAN ANDA❗❗\nPlugin ini secara otomatis menyelesaikan reCAPTCHA dengan memilih dan mengklik gambar — seluruh pemrosesan dilakukan oleh jaringan saraf yang tertanam langsung di dalam plugin.\n\nFitur:\n - Menyelesaikan reCAPTCHA V2 / V2 Invisible / Enterprise\n - Gratis\n - Tidak memerlukan kunci API, tidak memerlukan pembayaran\n - Jaringan saraf di dalam ekstensi berjalan di CPU\n - Dapat bekerja secara offline (tapi bagaimana cara memuat reCAPTCHA?)\n - Tidak memerlukan pendaftaran, langsung bekerja setelah instalasi\n\nDetail penggunaan:\n - Saat memulai, mungkin berhenti selama 5–15 detik saat memuat model AI\n - Hanya memahami bahasa Inggris, jadi secara otomatis mengubah reCAPTCHA ke bahasa Inggris\n - Di pengaturan, kamu dapat mengaktifkan/nonaktifkan plugin\n - Kamu dapat mengatur penundaan sebelum mengklik gambar\n - Plugin mengirim laporan ke captcharaptor\n - Laporan berisi gambar yang ditemuinya\n\nKekurangan saat ini:\n - Kadang membuat kesalahan\n - Tidak secara otomatis mengirimkan formulir setelah memecahkan captcha\n\nIni adalah versi publik pertama dari plugin. Daftar di captchaplugin.com untuk mendapatkan versi yang lebih kuat atau lebih cepat. Tapi pendaftaran tidak diperlukan agar versi ini berfungsi.",
    "actionTitle": "Buka MaiRec",
    "language": "Bahasa",
    "solver_enabled": "Pemecah diaktifkan",
    "recaptcha_support": "Dukungan reCAPTCHA",
    "autoclick_buttons": "Klik tombol otomatis",
    "solve_images": "Selesaikan tantangan gambar",
    "ws_mode": "Mode WS",
    "ws_mode_tooltip": "Memerlukan kunci API 32 karakter",
    "help_local_models": "Model berjalan secara lokal, tidak ada data yang dikirim ke luar.",
    "btn_timeouts": "Batas Waktu",
    "btn_reports": "Laporan",
    "visit_website": "Kunjungi captchaplugin.com",
    "btn_back": "← Kembali",
    "reports_title": "Laporan",
    "enable_reports": "Aktifkan laporan (dinonaktifkan)",
    "rep_key_label_16": "Kunci API (16 karakter)",
    "rep_key_label_16_32": "Kunci API (16 atau 32 karakter)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Kirim laporan",
    "status_uploads_disabled": "Unggahan data dinonaktifkan.",
    "status_last_sent": "Laporan terakhir terkirim: ",
    "status_last_error": "Kesalahan terakhir: ",
    "timeouts_title": "Batas Waktu",
    "timeouts_title_ms": "Batas Waktu (ms)",
    "timeout_between_clicks": "Antara klik ubin",
    "timeout_dynamic_reveal": "Kemunculan dinamis → klik",
    "timeout_verify": "Klik terakhir → verifikasi",
    "unit_ms": "ms",
    "help_timeouts": "Acak 0–300 md ditambahkan ke setiap batas waktu. Kemunculan dinamis menghitung waktu pengenalan yang telah digunakan."
  },
  "ja": {
    "appName": "MaiRec",
    "appDescription": "❗❗インストール後に動かない場合 – ブラウザを再起動してください❗❗\nこのプラグインは、画像を選択してクリックすることで reCAPTCHA を自動で解決します — 処理はすべてプラグイン内蔵のニューラルネットワークで行われます。\n\n機能：\n - reCAPTCHA V2 / V2 Invisible / Enterprise に対応\n - 無料\n - API キー不要、支払い不要\n - 拡張機能内のニューラルネットは CPU 上で動作\n - オフラインで動作可能（ただし reCAPTCHA をどう読み込むか？）\n - 登録不要、インストール後すぐに利用可能\n\n使用の詳細：\n - 起動時に AI モデルを読み込むため 5〜15 秒間停止することがあります\n - 英語のみ理解するため、reCAPTCHA を自動的に英語に切り替えます\n - 設定内で、プラグインを有効／無効にできます\n - 画像をクリックする前の遅延を設定できます\n - プラグインは captcharaptor にレポートを送信します\n - レポートには出会った画像が含まれます\n\n現在の欠点：\n - 時々間違いを犯すことがあります\n - キャプチャ解決後、自動でフォームを送信しません\n\nこれはプラグインの最初の公開バージョンです。より強力または高速なバージョンを入手するには captchaplugin.com に登録してください。ただし、このバージョンの動作には登録は不要です。",
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
    "visit_website": "captchaplugin.com にアクセス",
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
    "help_timeouts": "各タイムアウトにランダムで 0〜300 ms が追加されます。動的表示はすでに費やされた認識時間をカウントします。"
  },
  "ms": {
    "appName": "MaiRec",
    "appDescription": "❗❗JIKA IA TIDAK BERFUNGSI SELEPAS PEMASANGAN – MULAKAN SEMULA PELAYAR ANDA❗❗\nPlugin ini secara automatik menyelesaikan reCAPTCHA dengan memilih dan mengklik gambar — keseluruhan penyelesaian diproses oleh rangkaian neural yang tertanam terus dalam plugin.\n\nCiri-ciri:\n - Menyelesaikan reCAPTCHA V2 / V2 Invisible / Enterprise\n - Percuma\n - Tidak memerlukan kunci API atau bayaran\n - Rangkaian neural dalam sambungan berjalan pada CPU\n - Boleh berfungsi secara luar talian (tetapi bagaimana anda akan memuat reCAPTCHA?)\n - Tidak memerlukan pendaftaran, terus berfungsi selepas pemasangan\n\nButiran penggunaan:\n - Semasa permulaan, mungkin berehat selama 5–15 saat semasa memuat model AI\n - Hanya memahami Bahasa Inggeris, jadi secara automatik menukar reCAPTCHA ke bahasa Inggeris\n - Dalam tetapan, anda boleh membolehkan / melumpuhkan plugin\n - Anda boleh menetapkan kelewatan sebelum mengklik gambar\n - Plugin menghantar laporan ke captcharaptor\n - Laporan mengandungi gambar yang ditemuinya\n\nKekurangan semasa ini:\n - Kadang-kadang melakukan kesilapan\n - Tidak menyerahkan borang secara automatik selepas menyelesaikan captcha\n\nIni adalah versi awam pertama plugin. Daftar di captchaplugin.com untuk mendapatkan versi yang lebih kuat atau lebih pantas. Tetapi pendaftaran tidak diperlukan untuk versi ini berfungsi.",
    "actionTitle": "Buka MaiRec",
    "language": "Bahasa",
    "solver_enabled": "Penyelesai didayakan",
    "recaptcha_support": "Sokongan reCAPTCHA",
    "autoclick_buttons": "Autoklik butang",
    "solve_images": "Selesaikan cabaran imej",
    "ws_mode": "Mod WS",
    "ws_mode_tooltip": "Memerlukan kunci API 32 aksara",
    "help_local_models": "Model berjalan secara tempatan, tiada data dihantar ke luar.",
    "btn_timeouts": "Masa Tamat",
    "btn_reports": "Laporan",
    "visit_website": "Lawati captchaplugin.com",
    "btn_back": "← Kembali",
    "reports_title": "Laporan",
    "enable_reports": "Dayakan laporan (dinyahdayakan)",
    "rep_key_label_16": "Kunci API (16 aksara)",
    "rep_key_label_16_32": "Kunci API (16 atau 32 aksara)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Hantar laporan",
    "status_uploads_disabled": "Muat naik data dinyahdayakan.",
    "status_last_sent": "Laporan terakhir dihantar: ",
    "status_last_error": "Ralat terakhir: ",
    "timeouts_title": "Masa Tamat",
    "timeouts_title_ms": "Masa Tamat (ms)",
    "timeout_between_clicks": "Antara klik jubin",
    "timeout_dynamic_reveal": "Pendedahan dinamik → klik",
    "timeout_verify": "Klik terakhir → sahkan",
    "unit_ms": "ms",
    "help_timeouts": "0–300 ms rawak ditambah pada setiap masa tamat. Pendedahan dinamik mengira masa pengecaman yang telah digunakan."
  },
  "pt": {
    "appName": "MaiRec",
    "appDescription": "❗❗SE NÃO FUNCIONAR APÓS A INSTALAÇÃO – REINICIE SEU NAVEGADOR❗❗\nO plugin resolve automaticamente o reCAPTCHA selecionando e clicando nas imagens — toda a solução é processada por uma rede neural integrada diretamente dentro do plugin.\n\nRecursos:\n - Resolve reCAPTCHA V2 / V2 Invisible / Enterprise\n - Gratuito\n - Não requer chave de API, sem pagamentos necessários\n - A rede neural dentro da extensão roda na CPU\n - Pode funcionar offline (mas como você carregará o reCAPTCHA?)\n - Não exige registro, funciona assim que instalado\n\nDetalhes de uso:\n - Na inicialização, pode pausar por 5–15 segundos enquanto carrega modelos de IA\n - Entende apenas inglês, então muda automaticamente o reCAPTCHA para inglês\n - Nas configurações, você pode ativar/desativar o plugin\n - Você pode definir um atraso antes de clicar em uma imagem\n - O plugin envia relatórios para captcharaptor\n - Os relatórios contêm as imagens que ele encontrou\n\nDesvantagens atuais:\n - Às vezes comete erros\n - Não envia automaticamente o formulário após resolver o captcha\n\nEsta é a primeira versão pública do plugin. Cadastre-se em captchaplugin.com para obter versões mais poderosas ou rápidas. Mas o registro não é necessário para que esta versão funcione.",
    "actionTitle": "Abrir MaiRec",
    "language": "Idioma",
    "solver_enabled": "Solucionador ativado",
    "recaptcha_support": "Suporte ao reCAPTCHA",
    "autoclick_buttons": "Clique automático em botões",
    "solve_images": "Resolver desafios de imagens",
    "ws_mode": "Modo WS",
    "ws_mode_tooltip": "Requer uma chave de API de 32 caracteres",
    "help_local_models": "Os modelos rodam localmente, nenhum dado é enviado para fora.",
    "btn_timeouts": "Tempos limite",
    "btn_reports": "Relatórios",
    "visit_website": "Visite captchaplugin.com",
    "btn_back": "← Voltar",
    "reports_title": "Relatórios",
    "enable_reports": "Ativar relatórios (desativado)",
    "rep_key_label_16": "Chave API (16 caracteres)",
    "rep_key_label_16_32": "Chave API (16 ou 32 caracteres)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Enviar relatórios",
    "status_uploads_disabled": "O envio de dados está desativado.",
    "status_last_sent": "Último relatório enviado: ",
    "status_last_error": "Último erro: ",
    "timeouts_title": "Tempos limite",
    "timeouts_title_ms": "Tempos limite (ms)",
    "timeout_between_clicks": "Entre cliques nos blocos",
    "timeout_dynamic_reveal": "Revelação dinâmica → clique",
    "timeout_verify": "Último clique → verificar",
    "unit_ms": "ms",
    "help_timeouts": "Um tempo aleatório de 0–300 ms é adicionado a cada tempo limite. A revelação dinâmica conta o tempo de reconhecimento já decorrido."
  },
  "ru": {
    "appName": "MaiRec",
    "appDescription": "❗❗ЕСЛИ ПОСЛЕ УСТАНОВКИ НЕ РАБОТАЕТ – ПЕРЕЗАПУСТИТЕ БРАУЗЕР❗❗\nПлагин автоматически решает reCAPTCHA, выбирая и кликая по изображениям — всё обрабатывается нейросетью прямо внутри расширения.\n\nВозможности:\n - Решает reCAPTCHA V2 / V2 Invisible / Enterprise\n - Бесплатно\n - Не нужен API-ключ, нет платежей\n - Нейросеть внутри расширения работает на CPU\n - Может работать офлайн (но как вы загрузите reCAPTCHA?)\n - Не требует регистрации, работает сразу после установки\n\nОсобенности использования:\n - При запуске может тормозить 5–15 секунд во время загрузки AI-моделей\n - Понимает только английский, поэтому автоматически переключает reCAPTCHA на English\n - В настройках можно включить/выключить плагин\n - Можно задать задержку перед кликом по изображению\n - Плагин отправляет отчёты в captcharaptor\n - Отчёты содержат изображения, которые он встретил\n\nНедостатки:\n - Иногда ошибается\n - Не отправляет форму автоматически после решения капчи\n\nЭто первая публичная версия плагина. Зарегистрируйтесь на captchaplugin.com, чтобы получить более мощные или быстрые версии. Но для этой версии регистрация не требуется.",
    "actionTitle": "Открыть MaiRec",
    "language": "Язык",
    "solver_enabled": "Решатель включен",
    "recaptcha_support": "Поддержка reCAPTCHA",
    "autoclick_buttons": "Автоклик по кнопкам",
    "solve_images": "Решать графические задачи",
    "ws_mode": "Режим WS",
    "ws_mode_tooltip": "Требуется 32-значный API-ключ",
    "help_local_models": "Модели работают локально, данные не отправляются наружу.",
    "btn_timeouts": "Таймауты",
    "btn_reports": "Отчеты",
    "visit_website": "Посетить captchaplugin.com",
    "btn_back": "← Назад",
    "reports_title": "Отчеты",
    "enable_reports": "Включить отчеты (отключено)",
    "rep_key_label_16": "API-ключ (16 символов)",
    "rep_key_label_16_32": "API-ключ (16 или 32 символа)",
    "rep_key_placeholder": "secretkey0123456",
    "btn_send_reports": "Отправить отчеты",
    "status_uploads_disabled": "Загрузка данных отключена.",
    "status_last_sent": "Последний отчет отправлен: ",
    "status_last_error": "Последняя ошибка: ",
    "timeouts_title": "Таймауты",
    "timeouts_title_ms": "Таймауты (мс)",
    "timeout_between_clicks": "Между кликами по плиткам",
    "timeout_dynamic_reveal": "Динамическое появление → клик",
    "timeout_verify": "Последний клик → проверка",
    "unit_ms": "мс",
    "help_timeouts": "К каждому таймауту случайно добавляется 0–300 мс. Динамическое появление учитывает уже затраченное время распознавания."
  },
  "zh": {
    "appName": "MaiRec",
    "appDescription": "❗❗如果安装后无效 – 请重启浏览器❗❗\n该插件通过选择并点击图片自动解决 reCAPTCHA — 整个过程由插件内置的神经网络处理。\n\n功能：\n - 支持 reCAPTCHA V2 / V2 隐形 / Enterprise\n - 免费\n - 无需 API 密钥，也无需付款\n - 扩展内的神经网络在 CPU 上运行\n - 可离线工作（不过 reCAPTCHA 要怎么加载？）\n - 无需注册，安装后即可使用\n\n使用说明：\n - 启动时可能会暂停 5–15 秒以加载 AI 模型\n - 仅识别英文，因此会自动将 reCAPTCHA 切换为英文\n - 在设置中，你可以启用/禁用插件\n - 你可以设置点击图片前的延迟\n - 插件会向 captcharaptor 发送报告\n - 报告中包含其遇到的图片\n\n目前的缺点：\n - 有时会出错\n - 解决验证码后不会自动提交表单\n\n这是插件的第一个公开版本。前往 captchaplugin.com 注册以获得更强大或更快速的版本。但此版本无需注册即可使用。",
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
    "visit_website": "访问 captchaplugin.com",
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
    "help_timeouts": "每个超时时间都会随机增加 0–300 毫秒。动态出现会计算已消耗的识别时间。"
  }
};

export function normalizeLanguage(lang) {
  if (!lang || typeof lang !== 'string') return 'en';
  const clean = lang.toLowerCase().trim();
  if (translations[clean]) return clean;
  const prefix = clean.split(/[-_]/)[0];
  if (translations[prefix]) return prefix;
  return 'en';
}

export function getMessage(key, lang = 'en') {
  const norm = normalizeLanguage(lang);
  if (translations[norm] && translations[norm][key] !== undefined) {
    return translations[norm][key];
  }
  if (translations.en && translations.en[key] !== undefined) {
    return translations.en[key];
  }
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return key;
}

export function applyTranslations(lang, root = document) {
  const norm = normalizeLanguage(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = norm;
    document.documentElement.dir = (norm === 'ar') ? 'rtl' : 'ltr';
  }
  const elements = root.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = getMessage(key, norm);
    }
  });

  const titleEls = root.querySelectorAll('[data-i18n-title]');
  titleEls.forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = getMessage(key, norm);
    }
  });

  const phEls = root.querySelectorAll('[data-i18n-placeholder]');
  phEls.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = getMessage(key, norm);
    }
  });

  const ariaEls = root.querySelectorAll('[data-i18n-aria-label]');
  ariaEls.forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) {
      el.setAttribute('aria-label', getMessage(key, norm));
    }
  });

  return norm;
}

export async function getStoredLanguage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(['language', 'settings']);
      if (res?.language) return normalizeLanguage(res.language);
      if (res?.settings?.language) return normalizeLanguage(res.settings.language);
    }
  } catch {}
  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
    return normalizeLanguage(chrome.i18n.getUILanguage());
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLanguage(navigator.language);
  }
  return 'en';
}

export async function setStoredLanguage(lang) {
  const norm = normalizeLanguage(lang);
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ language: norm });
    }
  } catch {}
  return norm;
}
