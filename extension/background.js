importScripts(chrome.runtime.getURL('background_sqlite.js'));
    var i = chrome;
    var te = "en",
        re = "en";
    {
        let e = function(t, r, o, n) {
            return {
                id: n,
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: {
                        transform: {
                            queryTransform: {
                                addOrReplaceParams: [{
                                    key: t,
                                    value: r
                                }]
                            }
                        }
                    }
                },
                condition: {
                    regexFilter: o,
                    resourceTypes: ["sub_frame"]
                }
            }
        };
        i.declarativeNetRequest.updateDynamicRules({
            addRules: [e("hl", te, "^https?://[^\\.]*\\.(google\\.com|recaptcha\\.net)/recaptcha", 1)],
            removeRuleIds: [1]
        })
    }
    var p = new Map;
    chrome.tabs.onUpdated.addListener((e, t) => {
        p.has(e) && !("url" in t) || p.set(e, new Set)
    });
    chrome.tabs.onRemoved.addListener(e => {
        p.delete(e)
    });
    



    async function U([e], t) {
        let r = t.tab?.id;
        if (!r) return console.warn("[TABS ERROR] unable to figure out tabId");
        p.has(r) || p.set(r, new Set), p.get(r).add(e)
    }
    async function q() {
        let e = await new Promise(t => {
            i.tabs.query({
                active: !0,
                currentWindow: !0
            }, ([r]) => {
                t(r)
            })
        });
        return p.has(e.id) ? [...p.get(e.id)] : []
    }
    var y = {
        version: 20,
        key: "",
        keys: [],
        enabled: !0,
        disabled_hosts: [],
        recaptcha_auto_open: !0,
        recaptcha_auto_solve: !0,
        recaptcha_delay_between_clicks: 300,
        recaptcha_delay_dynamic_reveal: 850,
        recaptcha_delay_before_verify: 850,
    };
    var v = i.action,
        R = !0;

    function P(e) {
        if (e === R) return;
        R = e;
        let t = e ? "" : "g",
            r = [new Promise(o => {
                v.setIcon({
                    path: Object.fromEntries([16, 32, 48, 128].map(n => [n, `/icon/${n}${t}.png`]))
                }, o)
            })];
        return w && r.push(new Promise(o => {
            v.setBadgeText({
                text: e ? w : ""
            }, o)
        })), Promise.all(r)
    }
    var w = "";

    function k(e, t) {
        if (e !== w) return w = e, Promise.all([new Promise(r => {
            if (!R) return r();
            v.setBadgeText({
                text: e
            }, r)
        }), new Promise(r => {
            v.setBadgeBackgroundColor({
                color: t
            }, r)
        })])
    }

    function N(e, t) {
        return t.tab.url
    }

    function B() {
        return new Promise(e => {
            i.tabs.query({
                active: !0,
                currentWindow: !0
            }, ([t]) => e(t))
        })
    }
    async function m() {
        return (await B()).id
    }
    async function J() {
        let e = await B();
        return e && e.url && new URL(e.url).href
    }
    async function M() {
        let e = await B();
        return JSON.stringify(e)
    }
    var I = new Set,
        A = new Set;
    i.runtime.onConnect.addListener(e => {
        e.name === "stream" ? (I.add(e), e.onDisconnect.addListener(() => {
            I.delete(e)
        })) : e.name === "broadcast" && (A.add(e), e.onDisconnect.addListener(() => {
            A.delete(e)
        }))
    });

    function O(e) {
        I.forEach(t => t.postMessage(e))
    }
    async function F(e) {
        let t = await m();
        e = {
            data: e,
            event: "broadcast"
        }, A.forEach(r => {
            r.sender?.tab?.id !== void 0 && t === r.sender?.tab?.id && r.postMessage(e)
        })
    }
    var L = new Promise(e => {
        i.storage.local.get("settings", t => {
            if (!t?.settings) return e(y);
            let {
                settings: r
            } = t;
            r.version !== y.version && (r = {
                ...y,
                key: r.key
            }), r.enabled || P(!1), e(r)
        })
    });

    function f() {
        return L
    }
    async function E(e) {
        let t = {
            ...await L,
            ...e
        };
        return P(t.enabled), new Promise(r => {
            i.storage.local.set({
                settings: t
            }, () => {
                L = Promise.resolve(t), O({
                    event: "settingsUpdate",
                    settings: e
                }), r(null)
            })
        })
    }

    function V() {
        let e;
        return t => e || (e = t().finally(() => e = void 0), e)
    }
    var W, oe = V();

    function T() {
        return oe(() => se())
    }
    async function G() {
        return W
    }
        function h(e) {
        return new Promise(t => setTimeout(t, e))
    }

    function $(e, t = 2166136261) {
        let r = t;
        for (let o of e) r ^= o, r += r << 1;
        return r >>> 0
    }
    async function z([e, t]) {
        let r = await fetch(e, t);
        return {
            headers: Object.fromEntries(r.headers.entries()),
            status: r.status,
            ok: r.ok,
            text: await r.text()
        }
    }
    async function Q([e, t]) {
        let r = await fetch(e, t),
            o = await r.blob(),
            n = new FileReader;
        return await new Promise(a => {
            n.addEventListener("load", a), n.readAsDataURL(o)
        }), {
            headers: Object.fromEntries(r.headers.entries()),
            status: r.status,
            ok: r.ok,
            data: n.result
        }
    }

    function D(e) {
        let t = ("b5b38eb8f40354127a85285f82a51f8b" + e).split("").map(r => r.charCodeAt(0));
        return Z(t)
    }
    var Y = new Uint32Array(256);
    for (let e = 256; e--;) {
        let t = e;
        for (let r = 8; r--;) t = t & 1 ? 3988292384 ^ t >>> 1 : t >>> 1;
        Y[e] = t
    }

    function Z(e) {
        let t = -1;
        for (let r of e) t = t >>> 8 ^ Y[t & 255 ^ r];
        return (t ^ -1) >>> 0
    }


    var ue = {
        "phash::lookup": ([p]) => self.queryPhash(p),
        "settings::get": f,
        "settings::update": ([e]) => E(e),
        "tab::getURL": N,
        "tab::registerDetectedCaptcha": U
    };
    i.runtime.onMessage.addListener((e, t, r) => {
        if (!Array.isArray(e)) return;
        let o = e[1],
            n = ue[o];
        if (typeof n !== 'function') return;
        return Promise.resolve(n(e.slice(2), t)).then(a => {
            r([D(e[0]), a]); void chrome.runtime.lastError;
        }).catch(a => {
            console.error(`[RPC Error] [${o}] errored!`, e.slice(2), a);
            r([D(e[0]), "" + a]); void chrome.runtime.lastError;
        }), !0
    });





(function(){
  // Background data collection and logging are permanently disabled.
  // Purge any previously stored caplog database and tracking state from disk.
  try { indexedDB.deleteDatabase('caplog'); } catch (e) {}
  try { chrome.storage.local.remove('caplog_solved'); } catch (e) {}

  // Safe stub RPC handlers for backwards compatibility (no-op, return success)
  ue['caplog::put33']      = () => Promise.resolve(true);
  ue['caplog::bulk33']     = () => Promise.resolve(true);
  ue['caplog::put44']      = () => Promise.resolve(true);
  ue['caplog::bulk44']     = () => Promise.resolve(true);
  ue['caplog::getAll']     = () => Promise.resolve([]);
  ue['caplog::beginSolve'] = () => Promise.resolve(true);
  ue['caplog::markSolved'] = () => Promise.resolve(true);
  ue['caplog::clear']      = () => Promise.resolve(true);
  ue['capimg::put']        = () => Promise.resolve(true);
  ue['capimg::bulkPut']    = () => Promise.resolve(true);
})();


chrome.runtime.onStartup.addListener(initReportingKey);
chrome.runtime.onInstalled.addListener(initReportingKey);

async function initReportingKey() {
  const data = await chrome.storage.local.get('reporting');
  let reporting = data.reporting || {};
  // Do not generate telemetry tracking keys.
  // Preserve user-configured 32-character API key for WS mode if present.
  if (reporting.key && reporting.key.length === 32) {
    // Keep user's WS mode API key
  } else if (reporting.key) {
    delete reporting.key;
    await chrome.storage.local.set({ reporting });
  }
}

initReportingKey();

importScripts(chrome.runtime.getURL('uploader.js'));
importScripts(chrome.runtime.getURL('ws/background_ws.js'));
