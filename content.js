console.log("⚡ [Fnac Bot] Extension active et chargée sur la page !");

// 💳 Informations de carte bancaire
const MY_CARD_NUM = "5133791120850030";
const MY_CARD_EXP = "0228";
const MY_CARD_CVV = "868";

function isVisible(el) {
  if (!el) return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function findElementByText(selectors, text) {
  const elements = Array.from(document.querySelectorAll(selectors));
  return elements.find(el => el.textContent && el.textContent.toLowerCase().includes(text.toLowerCase()) && isVisible(el));
}

function setReactInputValue(input, value) {
  if (!input || !value) return;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

let isProcessing = false;
let hasClickedCheckout = false;

async function runAutoBot() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    if (!chrome.runtime?.id) return;

    const {
      botEnabled = false,
      targetQty = 1,
      useMaxQty = false,
      address = ''
    } = await chrome.storage.local.get(['botEnabled', 'targetQty', 'useMaxQty', 'address']);

    if (!botEnabled) return;

    const currentUrl = window.location.href;

    // =====================================================================
    // --- ÉTAPE 1 : PANIER ---
    // =====================================================================
    const isCartPage = currentUrl.includes('panier') || document.querySelector('[data-testid="cart-container"], [data-testid="cart"]');

    if (isCartPage) {
      const dropdowns = document.querySelectorAll('[data-testid="productQuantityDropdown"]');
      for (let select of dropdowns) {
        let qtyToSet = useMaxQty ? select.options.length : parseInt(targetQty || 1);
        if (useMaxQty && qtyToSet > 5) qtyToSet = 5;

        if (select.value !== qtyToSet.toString()) {
          select.value = qtyToSet.toString();
          select.dispatchEvent(new Event('change', { bubbles: true }));
          hasClickedCheckout = false;
          await new Promise(r => setTimeout(r, 600));
        }
      }

      if (!hasClickedCheckout) {
        const btnLivraison = document.querySelector('[data-testid="summary-checkout-button"]') || 
                             findElementByText('button, a', 'Choisir ma livraison') || 
                             findElementByText('button, a', 'Valider mon panier');

        if (btnLivraison) {
          console.log("⚡ [Fnac Bot] Validation du panier...");
          hasClickedCheckout = true;
          btnLivraison.click();
        }
      }
      return;
    }

    hasClickedCheckout = false;

    // =====================================================================
    // --- ÉTAPE 2 : RECHERCHE ET CHOIX DU POINT RELAIS ---
    // =====================================================================
    // 2.1 Si le bouton radio "Point relais" est présent sur la page de choix de livraison, le cocher
    const relayRadioText = findElementByText('span, div, label, p', 'Livraison en point relais') || 
                           findElementByText('span, div, label, p', 'Point relais');

    if (relayRadioText) {
      const relayContainer = relayRadioText.closest('label, div') || relayRadioText.parentElement;
      const radioInput = relayContainer?.querySelector('input[type="radio"]');

      if (radioInput && !radioInput.checked) {
        console.log("⚡ [Fnac Bot] Sélection du mode 'Livraison en point relais'...");
        radioInput.click();
        if (relayContainer) relayContainer.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 2.2 Logique de recherche du point relais
    const isRelayPage = currentUrl.includes('relais-colis') || 
                        document.querySelector('input[placeholder*="Maury"], input[placeholder*="adresse"], input[placeholder*="Code postal"]') ||
                        document.querySelector('[data-testid="shippingRelaySelection"]');

    if (isRelayPage) {
      const relayLink = document.querySelector('[data-testid="shippingRelaySelection"]');
      if (relayLink && isVisible(relayLink)) {
        console.log("⚡ [Fnac Bot] Redirection vers le choix du point relais...");
        relayLink.click();
        await new Promise(r => setTimeout(r, 500));
      }

      const searchInput = document.querySelector('input[placeholder*="Maury"], input[placeholder*="adresse"], input[placeholder*="Code postal"]') || 
                          document.querySelector('input[type="text"], input[type="search"]');

      // 1. Saisie de l'adresse si nécessaire
      if (searchInput && address && searchInput.value !== address) {
        console.log(`⚡ [Fnac Bot] Saisie de l'adresse : ${address}`);
        searchInput.focus();
        setReactInputValue(searchInput, address);
        await new Promise(r => setTimeout(r, 300));

        const okBtn = findElementByText('button, a', 'OK') || document.querySelector('button[type="submit"]');
        if (okBtn) {
          console.log("⚡ [Fnac Bot] Clic sur le bouton OK...");
          okBtn.click();
        } else {
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      // 2. Recherche et sélection du point relais
      let selectRelayBtn = findElementByText('button, a', 'Choisir ce point relais') || 
                           findElementByText('button, a', 'Choisir mon point relais') || 
                           findElementByText('button, a', 'Choisir');

      if (selectRelayBtn) {
        console.log("⚡ [Fnac Bot] Bouton 'Choisir ce point relais' trouvé ! Clic...");
        selectRelayBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        selectRelayBtn.click();

        await new Promise(r => setTimeout(r, 1000));
        const confirmBtn = findElementByText('button, a', 'Valider') || findElementByText('button, a', 'Confirmer');
        if (confirmBtn) confirmBtn.click();
      }
    }

    // 2.3 Bouton de passage au paiement après le choix de livraison
    const goToPaymentBtn = findElementByText('button, a', 'Passer au paiement') || 
                           findElementByText('button, a', 'Accéder au paiement');

    const paymentForm = document.querySelector('[data-testid="paymentCBForm"]') || 
                        document.querySelector('[data-testid="paymentChoiceHeader"]') ||
                        document.querySelector('.paymentHeader_1JSJD');

    // 🛑 VERROU : Si "Passer au paiement" est présent et que le formulaire CB n'est pas encore là
    if (goToPaymentBtn && !paymentForm) {
      console.log("⚡ [Fnac Bot] Clic sur 'Passer au paiement'...");
      goToPaymentBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      return;
    }

    // 🛑 VERROU : Si on est encore dans l'étape relais sans paiement affiché, on s'arrête là
    if (isRelayPage && !paymentForm) {
      return;
    }

    // =====================================================================
    // --- ÉTAPE 3 : PAIEMENT (CARTE BANCAIRE) ---
    // =====================================================================
    if (paymentForm && isVisible(paymentForm)) {
      const cbHeader = document.querySelector('[data-paymentmethod="ogone"] [data-testid="paymentChoiceHeader"]');
      if (cbHeader) {
        cbHeader.click();
      }

      const cbRadio = document.querySelector('[data-testid="input-payment-method-Cartebancaire"]');
      if (cbRadio && !cbRadio.checked) {
        console.log("⚡ [Fnac Bot] Sélection de l'option Carte Bancaire...");
        cbRadio.click();
        await new Promise(r => setTimeout(r, 500));
      }

      const numInput = document.querySelector('[data-testid="cardNumber-input"]');
      const expInput = document.querySelector('[data-testid="expiry-input"]');
      const cvvInput = document.querySelector('[data-testid="cvc-input"]');

      let hasFilledData = false;

      if (numInput && numInput.value.replace(/\s/g, '') !== MY_CARD_NUM) {
        console.log("⚡ [Fnac Bot] Saisie du numéro de carte...");
        setReactInputValue(numInput, MY_CARD_NUM);
        hasFilledData = true;
      }
      if (expInput && expInput.value.replace(/\//g, '') !== MY_CARD_EXP) {
        console.log("⚡ [Fnac Bot] Saisie de la date d'expiration...");
        setReactInputValue(expInput, MY_CARD_EXP);
        hasFilledData = true;
      }
      if (cvvInput && cvvInput.value !== MY_CARD_CVV) {
        console.log("⚡ [Fnac Bot] Saisie du cryptogramme...");
        setReactInputValue(cvvInput, MY_CARD_CVV);
        hasFilledData = true;
      }

      if (hasFilledData) {
        await new Promise(r => setTimeout(r, 800));
      }

      const payBtn = document.querySelector('[data-testid="btn-payment-submit"]');
      if (payBtn) {
        if (!payBtn.disabled) {
          console.log("⚡ [Fnac Bot] Clic sur le bouton PAYER !");
          payBtn.click();
          await chrome.storage.local.set({ botEnabled: false });
        } else {
          console.log("⚡ [Fnac Bot] Attente de la validation du formulaire de paiement...");
        }
      }
      return;
    }

  } catch (err) {
    if (!err.message?.includes('Extension context invalidated')) {
      console.error("❌ [Fnac Bot] Erreur :", err);
    }
  } finally {
    isProcessing = false;
  }
}

// Boucle principale
setInterval(runAutoBot, 500);

// Écouteur de messages
if (chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "checkState") runAutoBot();
  });
}