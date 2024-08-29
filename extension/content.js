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
  try {
    const signature = await signData(data);
    
    // Retrieve the API URL from storage
    const result = await chrome.storage.local.get(['apiUrl']);
    const apiUrl = result.apiUrl;
    
    if (!apiUrl) {
      throw new Error("API URL not set. Please configure it in the extension settings.");
    }

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

    const responseData = await response.json();
    console.log('Success:', responseData);
    alert('Data submitted successfully!');
  } catch (error) {
    console.error('Error:', error);
    alert('Error submitting data: ' + error.message);
  }
}

function addParseButton() {
  const downloadAllButton = document.querySelector('button[data-testid="thing-page-download-all-button"]');
  if (downloadAllButton && !document.querySelector('#parse-submit-button')) {
    const parseButton = document.createElement('button');
    parseButton.id = 'parse-submit-button';
    parseButton.className = 'parse-submit-button';
    parseButton.innerText = 'Parse & Submit';
    parseButton.addEventListener('click', async () => {
      const data = parseThingiverseData();
      await submitToAPI(data);
    });
    downloadAllButton.parentNode.insertBefore(parseButton, downloadAllButton);
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
