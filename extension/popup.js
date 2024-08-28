document.addEventListener('DOMContentLoaded', function() {
  const apiUrlInput = document.getElementById('apiUrlInput');
  const privateKeyInput = document.getElementById('privateKeyInput');
  const saveButton = document.getElementById('saveButton');
  const status = document.getElementById('status');

  // Load existing configuration if any
  chrome.storage.local.get(['apiUrl', 'privateKey'], function(result) {
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
    if (result.privateKey) {
      privateKeyInput.value = result.privateKey;
    }
  });

  saveButton.addEventListener('click', function() {
    const apiUrl = apiUrlInput.value.trim();
    const privateKey = privateKeyInput.value.trim();
    
    if (apiUrl && privateKey) {
      chrome.storage.local.set({apiUrl: apiUrl, privateKey: privateKey}, function() {
        status.textContent = 'Configuration saved successfully!';
        setTimeout(() => { status.textContent = ''; }, 3000);
      });
    } else {
      status.textContent = 'Please enter both API URL and private key.';
    }
  });
});
