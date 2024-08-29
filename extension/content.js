function parseThingiverseData() {
  const title = document.querySelector('h1').innerText;
  const description = document.querySelector('.thing-description').innerText;
  const creator = document.querySelector('.thing-creator').innerText;
  const likes = document.querySelector('.thing-like-count').innerText;
  const downloads = document.querySelector('.thing-download-count').innerText;

  return {
    title,
    description,
    creator,
    likes,
    downloads,
    url: window.location.href
  };
}

async function signData(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['privateKey'], async (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      const privateKey = result.privateKey;
      if (!privateKey) {
        return reject(new Error("Private key not found. Please set it in the extension configuration."));
      }

      try {
        const key = await window.crypto.subtle.importKey(
          "jwk",
          JSON.parse(privateKey),
          {
            name: "ECDSA",
            namedCurve: "P-256"
          },
          false,
          ["sign"]
        );

        const signature = await window.crypto.subtle.sign(
          {
            name: "ECDSA",
            hash: {name: "SHA-256"},
          },
          key,
          new TextEncoder().encode(JSON.stringify(data))
        );

        resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(signature))));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function submitToAPI(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['apiUrl'], async (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      const apiUrl = result.apiUrl;
      if (!apiUrl) {
        return reject(new Error("API URL not found. Please set it in the extension configuration."));
      }

      try {
        const signature = await signData(data);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: data,
            signature: signature
          })
        });

        const result = await response.json();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function addParseButton() {
  const shareButton = document.querySelector('button[aria-label="Share Thing"]');
  if (shareButton && !document.querySelector('#parse-submit-button')) {
    const parseButton = document.createElement('button');
    parseButton.id = 'parse-submit-button';
    parseButton.className = 'parse-submit-button';
    parseButton.innerText = 'Parse & Submit';
    parseButton.addEventListener('click', async () => {
      try {
        const data = parseThingiverseData();
        const result = await submitToAPI(data);
        console.log('Success:', result);
        alert('Data submitted successfully!');
      } catch (error) {
        console.error('Error:', error);
        alert('Error submitting data: ' + error.message);
      }
    });
    shareButton.parentNode.insertBefore(parseButton, shareButton.nextSibling);
  }
}

// Run the function when the page loads
addParseButton();

// Also run the function when the URL changes without a page reload
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    addParseButton();
  }
}).observe(document, {subtree: true, childList: true});
