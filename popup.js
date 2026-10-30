document.addEventListener('DOMContentLoaded', async () => {
  const targetQtyInput = document.getElementById('targetQty');
  const useMaxQtyInput = document.getElementById('useMaxQty');
  const addressInput = document.getElementById('address');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');

  const { targetQty, useMaxQty, address, botEnabled } = await chrome.storage.local.get(['targetQty', 'useMaxQty', 'address', 'botEnabled']);
  if (targetQty) targetQtyInput.value = targetQty;
  if (useMaxQty !== undefined) useMaxQtyInput.checked = useMaxQty;
  if (address) addressInput.value = address;
  
  updateStatusUI(botEnabled);

  startBtn.addEventListener('click', async () => {
    const qty = parseInt(targetQtyInput.value) || 1;
    const maxQty = useMaxQtyInput.checked;
    const addr = addressInput.value.trim();

    await chrome.storage.local.set({
      targetQty: qty,
      useMaxQty: maxQty,
      address: addr,
      botEnabled: true
    });

    updateStatusUI(true);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: "checkState" });
    }
  });

  stopBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ botEnabled: false });
    updateStatusUI(false);
  });

  function updateStatusUI(enabled) {
    if (enabled) {
      statusDiv.textContent = "Statut : ACTIF ⚡";
      statusDiv.style.color = "green";
    } else {
      statusDiv.textContent = "Statut : Inactif";
      statusDiv.style.color = "#666";
    }
  }
});