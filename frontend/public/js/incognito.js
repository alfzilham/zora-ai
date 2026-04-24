/**
 * ZORA AI - Incognito Chat
 * No history saved. AI still active.
 */

const incogState = {
    user: null,
    messages: [],
    extended: false,
    isStreaming: false,
};

function qs(id) { return document.getElementById(id); }

function getTokenOrRedirect() {
    const token = localStorage.getItem("zora_token");
    if (!token) { window.location.href = "/auth/login.html"; return null; }
    return token;
}

function getResponseData(res) { return res?.data || res || {}; }

async function apiCallOrWarn(endpoint, method = "GET", body = null) {
    try { return await apiCall(endpoint, method, body, true); }
    catch (err) {
        const msg = String(err?.message || "").toLowerCase();
        if (err?.status === 404 || msg.includes("404")) { console.warn("Unavailable:", endpoint); return null; }
        throw err;
    }
}

// ─── RIPPLE TRANSITION ────────────────────────────────
function triggerRipple(fromEl, targetUrl) {
    const overlay = qs("rippleOverlay");
    const rect = fromEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 1.2;

    overlay.classList.remove("hidden");

    const circle = document.createElement("div");
    circle.className = "ripple-circle";
    const size = maxR * 2;
    circle.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${cx - size / 2}px; top: ${cy - size / 2}px;
        background: #f5f5f5;
    `;
    overlay.appendChild(circle);

    setTimeout(() => { window.location.href = targetUrl; }, 500);
}

// ─── UI HELPERS ───────────────────────────────────────
function autoResize() {
    const el = qs("chatInput");
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function scrollBottom() {
    requestAnimationFrame(() => {
        const s = qs("messageScroller");
        if (s) s.scrollTop = s.scrollHeight;
    });
}

function setTyping(visible) {
    qs("typingIndicator")?.classList.toggle("hidden", !visible);
    if (visible) scrollBottom();
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderMessages() {
    const list = qs("messageList");
    const welcome = qs("welcomeScreen");
    const msgScreen = qs("messageScreen");
    const hasMessages = incogState.messages.length > 0;

    if (welcome) welcome.style.display = hasMessages ? "none" : "flex";
    if (msgScreen) msgScreen.classList.toggle("hidden", !hasMessages);

    if (!list) return;

    list.innerHTML = incogState.messages.map((msg) => {
        const isUser = msg.role === "user";
        const content = typeof marked !== "undefined" && !isUser
            ? marked.parse(msg.content || "")
            : escapeHtml(msg.content || "");

        return isUser ? `
            <div class="incognito-message incognito-user-msg">
                <span class="msg-sender">You</span>
                <div class="msg-content">${escapeHtml(msg.content || "")}</div>
            </div>
        ` : `
            <div class="incognito-message incognito-zora-msg">
                <div class="msg-header">
                    <img src="/assets/images/logo/logo.png" class="zora-msg-avatar" alt="ZORA">
                    <span class="msg-sender">ZORA</span>
                </div>
                <div class="msg-content markdown-body">${content}</div>
            </div>
        `;
    }).join("");

    scrollBottom();
}

function appendMessage(role, content) {
    incogState.messages.push({ role, content });
    renderMessages();
}

// ─── SEND MESSAGE ─────────────────────────────────────
async function sendMessage() {
    if (incogState.isStreaming) return;

    const input = qs("chatInput");
    const text = input?.value.trim();
    if (!text) return;

    input.value = "";
    autoResize();

    appendMessage("user", text);
    setTyping(true);
    incogState.isStreaming = true;

    try {
        const res = await apiCallOrWarn("/chat/send", "POST", {
            message: text,
            extended: incogState.extended,
            incognito: true,
            conversation_id: null,
        });

        const data = getResponseData(res);
        const reply = data.response || data.message || data.content
            || "ZORA is thinking... (backend not connected)";

        setTyping(false);
        appendMessage("assistant", reply);

    } catch (err) {
        setTyping(false);
        appendMessage("assistant", "Something went wrong. Please try again.");
        console.warn("Incognito send error:", err);
    } finally {
        incogState.isStreaming = false;
    }
}

// ─── VOICE INPUT ──────────────────────────────────────
const langCodeMap = {
    en: "en-US", id: "id-ID", ja: "ja-JP", ko: "ko-KR",
    zh: "zh-CN", fr: "fr-FR", de: "de-DE", it: "it-IT",
    pt: "pt-BR", es: "es-ES",
};

let recognitionInstance = null;
let isRecognizing = false;

function bindVoiceButton() {
    const btn = qs("voiceButton");
    if (!btn) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.style.opacity = "0.4"; btn.style.cursor = "not-allowed"; return; }

    btn.addEventListener("click", () => {
        isRecognizing ? stopVoice() : startVoice();
    });
}

function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = qs("voiceButton");
    const input = qs("chatInput");
    const lang = localStorage.getItem("zora_language") || "en";
    const saved = (input?.value || "").trim();

    recognitionInstance = new SR();
    recognitionInstance.lang = langCodeMap[lang] || "en-US";
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;

    recognitionInstance.onstart = () => { isRecognizing = true; btn?.classList.add("recording"); };
    recognitionInstance.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
        if (input) { input.value = saved ? `${saved} ${transcript}` : transcript; autoResize(); }
    };
    recognitionInstance.onend = stopVoice;
    recognitionInstance.onerror = (e) => { console.warn("Voice error:", e.error); stopVoice(); };
    recognitionInstance.start();
}

function stopVoice() {
    isRecognizing = false;
    qs("voiceButton")?.classList.remove("recording");
    recognitionInstance?.stop();
    recognitionInstance = null;
}

// ─── BOOTSTRAP ───────────────────────────────────────
async function bootstrap() {
    const token = getTokenOrRedirect();
    if (!token) return;

    // Load user silently
    try {
        const res = await apiCallOrWarn("/auth/me");
        incogState.user = getResponseData(res);
    } catch (e) { console.warn("User load failed:", e); }

    // Exit incognito button — ripple to chat
    qs("exitIncognitoBtn")?.addEventListener("click", (e) => {
        triggerRipple(e.currentTarget, "/chat/index.html");
    });

    // New chat button — clear messages
    qs("newChatBtn")?.addEventListener("click", () => {
        incogState.messages = [];
        renderMessages();
        const input = qs("chatInput");
        if (input) { input.value = ""; autoResize(); input.focus(); }
    });

    // Extended toggle
    qs("extendedToggle")?.addEventListener("click", () => {
        incogState.extended = !incogState.extended;
        qs("extendedToggle")?.classList.toggle("active", incogState.extended);
    });

    // Send button
    qs("sendButton")?.addEventListener("click", sendMessage);

    // Enter key
    qs("chatInput")?.addEventListener("input", autoResize);
    qs("chatInput")?.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); await sendMessage(); }
    });

    bindVoiceButton();
    autoResize();
    renderMessages();
}

document.addEventListener("DOMContentLoaded", bootstrap);