// Homepage fit check: the goal sets the field wording; one pre-typed message goes to the AI chat or a manager.
// Listeners are delegated on document so forms re-rendered by the theme editor keep working.
const fitStrings = (form) => {
  form.fitStrings ??= JSON.parse(form.querySelector('[data-fit-strings]').textContent);
  return form.fitStrings;
};
const fitGoal = (form) => form.querySelector('input[name="goal"]:checked').value;

// The "from the homepage" marker in the intro keeps these messages apart from the product-page fit check
const fitDraft = (form) => {
  const strings = fitStrings(form);
  const goal = fitGoal(form);
  const lines = [
    strings.intro,
    strings.goal.replace('%goal%', strings.goals[goal].name),
    `${strings.goals[goal].label}: ${form.elements.model.value.trim()}`,
  ];
  const installed = form.elements.installed.value.trim();
  if (goal === 'memory' && installed) lines.push(strings.installed.replace('%installed%', installed));
  return lines.join('\n');
};

// Messenger links end with an empty text/draft parameter; keep them filled so open-in-new-tab carries the message too.
// encodeURIComponent writes spaces as %20; a "+" may show literally in messengers (same as the product page).
const updateFitLinks = (form) => {
  const draft = encodeURIComponent(fitDraft(form));
  form.querySelectorAll('a[data-channel="telegram"], a[data-channel="viber"]').forEach((link) => {
    link.dataset.base ??= link.getAttribute('href');
    link.href = link.dataset.base + draft;
  });
};

const setFitGoal = (form, goal) => {
  const { label, placeholder } = fitStrings(form).goals[goal];
  form.querySelector(`input[name="goal"][value="${goal}"]`).checked = true;
  form.querySelector('[data-fit-label]').textContent = label;
  form.elements.model.placeholder = placeholder;
  form.querySelector('[data-fit-installed]').hidden = goal !== 'memory';
  updateFitLinks(form);
};

const showFitError = (form, show) => {
  if (show) form.elements.model.setAttribute('aria-invalid', 'true');
  else form.elements.model.removeAttribute('aria-invalid');
  form.querySelector('.home-fit__error').hidden = !show;
};

const hasShopAIChat = () => typeof window.ShopAIChat?.open === 'function';
const syncFitAI = () => {
  document.querySelectorAll('[data-fit]').forEach((form) => form.classList.toggle('home-fit__form--noai', !hasShopAIChat()));
};

// Returns false when the model is missing, so the caller can stop the link
const sendFit = (form, channel) => {
  if (channel !== 'phone') {
    if (!form.elements.model.value.trim()) {
      showFitError(form, true);
      form.elements.model.focus();
      return false;
    }
    showFitError(form, false);
  }

  (window.dataLayer = window.dataLayer || []).push({ event: 'fit_check_submit', goal: fitGoal(form), channel });
  if (channel === 'ai') window.ShopAIChat.open(fitDraft(form));
  return true;
};

document.addEventListener('change', (event) => {
  const form = event.target.closest('[data-fit]');
  if (form && event.target.name === 'goal') setFitGoal(form, event.target.value);
});

document.addEventListener('input', (event) => {
  const form = event.target.closest('[data-fit]');
  if (!form) return;
  if (event.target.name === 'model' && event.target.value.trim()) showFitError(form, false);
  updateFitLinks(form);
});

document.addEventListener('click', (event) => {
  // Links like the RAM picker's "check by model" preset the goal before jumping to #fit
  const preset = event.target.closest('a[data-goal]');
  const fit = preset && document.getElementById('fit');
  if (fit?.matches('[data-fit]')) setFitGoal(fit, preset.dataset.goal);

  const link = event.target.closest('[data-fit] a[data-channel]');
  if (link && !sendFit(link.closest('[data-fit]'), link.dataset.channel)) event.preventDefault();
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-fit]');
  if (!form) return;
  event.preventDefault();
  // Without the chat, Enter goes to the main button: Telegram
  if (hasShopAIChat()) sendFit(form, 'ai');
  else form.querySelector('a[data-channel="telegram"]').click();
});

syncFitAI();
document.addEventListener('shop-ai-chat:ready', syncFitAI);
document.addEventListener('shopify:section:load', syncFitAI);
