(() => {
  const ENDPOINT = "https://epbhiygonpkzlmbbsyqv.supabase.co/functions/v1/oyag-public-contact";
  const CHANNELS = {
    contato: { label: "Contato geral", email: "contato@cledemilsonoliveira.com" },
    comercial: { label: "Comercial", email: "comercial@cledemilsonoliveira.com" },
    suporte: { label: "Suporte", email: "suporte@cledemilsonoliveira.com" },
    financeiro: { label: "Financeiro", email: "financeiro@cledemilsonoliveira.com" },
    parcerias: { label: "Parcerias", email: "parcerias@cledemilsonoliveira.com" }
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));

  function channelFromHref(href) {
    if (!href || !href.startsWith("mailto:")) return null;
    const email = href.slice(7).split("?")[0].toLowerCase();
    return Object.keys(CHANNELS).find(key => CHANNELS[key].email === email) || null;
  }

  function buildModal() {
    const wrapper = document.createElement("div");
    wrapper.className = "oyag-contact-modal";
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <div class="oyag-contact-backdrop" data-contact-close></div>
      <section class="oyag-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="oyag-contact-title">
        <button class="oyag-contact-close" type="button" aria-label="Fechar" data-contact-close>×</button>
        <div class="oyag-contact-head">
          <p class="eyebrow">Contato OYAG</p>
          <h2 id="oyag-contact-title">Envie sua mensagem</h2>
          <p>Você está falando com <strong data-contact-channel></strong>.</p>
        </div>
        <form class="oyag-contact-form" novalidate>
          <input type="text" name="company" class="oyag-contact-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="oyag-contact-destination">
            <span>Destino</span>
            <strong data-contact-destination></strong>
          </div>
          <div class="oyag-contact-row">
            <label>Nome
              <input name="name" type="text" autocomplete="name" minlength="2" maxlength="120" required placeholder="Seu nome">
            </label>
            <label>E-mail
              <input name="email" type="email" autocomplete="email" maxlength="180" required placeholder="voce@exemplo.com">
            </label>
          </div>
          <div class="oyag-contact-row">
            <label>WhatsApp <small>(opcional)</small>
              <input name="whatsapp" type="tel" autocomplete="tel" maxlength="40" placeholder="(00) 00000-0000">
            </label>
            <label>Assunto
              <input name="subject" type="text" maxlength="160" required placeholder="Como podemos ajudar?">
            </label>
          </div>
          <label>Mensagem
            <textarea name="message" minlength="10" maxlength="5000" rows="6" required placeholder="Conte o que você precisa."></textarea>
          </label>
          <div class="oyag-contact-status" role="status" aria-live="polite"></div>
          <div class="oyag-contact-actions">
            <button class="button primary large oyag-contact-submit" type="submit">Enviar mensagem</button>
            <a class="button secondary large oyag-contact-mailto" href="#">Abrir no e-mail</a>
          </div>
          <small class="oyag-contact-privacy">Seus dados serão usados somente para responder a este contato.</small>
        </form>
      </section>
    `;
    document.body.appendChild(wrapper);
    return wrapper;
  }

  const modal = buildModal();
  const form = modal.querySelector(".oyag-contact-form");
  const channelName = modal.querySelector("[data-contact-channel]");
  const destination = modal.querySelector("[data-contact-destination]");
  const mailtoFallback = modal.querySelector(".oyag-contact-mailto");
  const status = modal.querySelector(".oyag-contact-status");
  const submit = modal.querySelector(".oyag-contact-submit");
  let activeChannel = "contato";
  let opener = null;

  function setMailto() {
    const data = new FormData(form);
    const subject = encodeURIComponent(String(data.get("subject") || "Contato pelo site OYAG Ecosystem"));
    const lines = [
      "Nome: " + String(data.get("name") || ""),
      "E-mail: " + String(data.get("email") || ""),
      "WhatsApp: " + String(data.get("whatsapp") || ""),
      "",
      String(data.get("message") || "")
    ];
    mailtoFallback.href = `mailto:${CHANNELS[activeChannel].email}?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
  }

  function openModal(channel, source) {
    activeChannel = CHANNELS[channel] ? channel : "contato";
    opener = source || null;
    const cfg = CHANNELS[activeChannel];
    channelName.textContent = cfg.label;
    destination.textContent = cfg.email;
    form.dataset.channel = activeChannel;
    status.textContent = "";
    status.className = "oyag-contact-status";
    setMailto();
    modal.hidden = false;
    document.documentElement.classList.add("oyag-contact-open");
    setTimeout(() => form.elements.name.focus(), 20);
  }

  function closeModal() {
    modal.hidden = true;
    document.documentElement.classList.remove("oyag-contact-open");
    status.textContent = "";
    if (opener) opener.focus();
  }

  document.querySelectorAll(".contact-address").forEach(link => {
    const channel = channelFromHref(link.getAttribute("href"));
    if (!channel) return;
    link.dataset.contactChannel = channel;
    link.addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openModal(channel, link);
    });
  });

  modal.querySelectorAll("[data-contact-close]").forEach(node => node.addEventListener("click", closeModal));
  document.addEventListener("keydown", event => {
    if (!modal.hidden && event.key === "Escape") closeModal();
  });

  form.addEventListener("input", setMailto);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "";
    status.className = "oyag-contact-status";

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const payload = {
      channel: activeChannel,
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      whatsapp: String(data.get("whatsapp") || "").trim(),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
      company: String(data.get("company") || "").trim(),
      source_url: location.href
    };

    submit.disabled = true;
    submit.textContent = "Enviando...";
    status.textContent = "Enviando sua mensagem com segurança.";

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Não foi possível enviar a mensagem.");
      }

      status.className = "oyag-contact-status success";
      status.innerHTML = result.email_sent ? `<strong>Mensagem enviada!</strong> Seu contato foi registrado no OYAG e encaminhado para ${escapeHtml(CHANNELS[activeChannel].label)}.` : `<strong>Mensagem registrada!</strong> Seu contato já entrou no pipeline OYAG. A notificação por e-mail deste formulário ainda não está ativa.`;
      form.reset();
      setMailto();
      submit.textContent = "Mensagem enviada ✓";
      setTimeout(() => {
        submit.disabled = false;
        submit.textContent = "Enviar mensagem";
      }, 1800);
    } catch (error) {
      status.className = "oyag-contact-status error";
      status.textContent = error?.message || "Não foi possível enviar agora. Use o botão “Abrir no e-mail” como alternativa.";
      submit.disabled = false;
      submit.textContent = "Enviar mensagem";
    }
  });
})();
