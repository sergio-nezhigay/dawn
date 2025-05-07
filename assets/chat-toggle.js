document.addEventListener('DOMContentLoaded', () => {
  const chatToggle = document.getElementById('chat-toggle');
  const chatOptions = document.getElementById('chatOptions');

  chatToggle.addEventListener('click', () => {
    const expanded = chatToggle.getAttribute('aria-expanded') === 'true' || false;
    chatToggle.setAttribute('aria-expanded', !expanded);
    chatOptions.style.display = expanded ? 'none' : 'flex';
    chatOptions.setAttribute('aria-hidden', expanded);
  });

  document.addEventListener('click', (event) => {
    if (!chatToggle.contains(event.target) && !chatOptions.contains(event.target)) {
      chatToggle.setAttribute('aria-expanded', 'false');
      chatOptions.style.display = 'none';
      chatOptions.setAttribute('aria-hidden', 'true');
    }
  });

  chatToggle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chatToggle.click();
    }
  });
});
