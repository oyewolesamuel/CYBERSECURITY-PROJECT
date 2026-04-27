// ===============================
// BASIC SETUP
// ===============================

// current mode (encrypt or decrypt)
let mode = 'encrypt';

// shortcut to get element
const $ = id => document.getElementById(id);

// bootstrap modal
const mainModal = new bootstrap.Modal(document.getElementById('mainModal'));


// ===============================
// UI FUNCTIONS
// ===============================

// show small message under the form
function setStatus(message, type = '') {
  const el = $('status');
  el.textContent = message;
  el.className = type;
}

const text = "NOW!!!";
const el = document.getElementById("nowText");

let index = 0;
let isDeleting = false;

function typeEffect() {
  if (!isDeleting) {
    // typing
    el.textContent = text.substring(0, index + 1);
    index++;

    if (index === text.length) {
      isDeleting = true;
      setTimeout(typeEffect, 1000); // pause before delete
      return;
    }
  } else {
    // deleting
    el.textContent = text.substring(0, index - 1);
    index--;

    if (index === 0) {
      isDeleting = false;
    }
  }

  setTimeout(typeEffect, isDeleting ? 80 : 120);
}

typeEffect();


// switch between encrypt and decrypt
function setMode(selectedMode) {
  mode = selectedMode;

  const isEncrypt = mode === 'encrypt';

  $('encryptBtn').classList.toggle('active', isEncrypt);
  $('decryptBtn').classList.toggle('active', !isEncrypt);

  $('msgLabel').textContent = isEncrypt
    ? 'Plaintext message'
    : 'Encrypted ciphertext';

  $('actionLabel').textContent = isEncrypt
    ? 'Encrypt Message'
    : 'Decrypt Message';

  $('message').placeholder = isEncrypt
    ? 'Type your message...'
    : 'Paste encrypted text...';

  setStatus('');

  $('result').value = '';
}


// show/hide password
function togglePassword() {
  const input = $('password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showModal({ title, message = '', type = 'info' }) {
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const copyBtn = document.getElementById('copyBtn');

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  // ❌ hide result box completely
  document.getElementById('modalResultText').style.display = 'none';
  copyBtn.style.display = 'none';

  // style
  modalTitle.className = 'modal-title';

  if (type === 'success') {
    modalTitle.classList.add('text-success');
  } else if (type === 'error') {
    modalTitle.classList.add('text-danger');
  } else {
    modalTitle.classList.add('text-info');
  }

  mainModal.show();
}

async function createKey(password, salt) {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptText(text, password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await createKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(text)
  );

  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);

  result.set(salt, 0);
  result.set(iv, 16);
  result.set(new Uint8Array(encrypted), 28);

  return btoa(String.fromCharCode(...result));
}


// DECRYPT FUNCTION
async function decryptText(data, password) {
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const encrypted = bytes.slice(28);

  const key = await createKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}


// ===============================
// MODAL FUNCTIONS
// ===============================

// show result inside modal
// function showResult(text) {
//   $('modalResultText').value = text;

//   document.querySelector('.modal-title').textContent =
//     mode === 'encrypt' ? 'Encrypted Message' : 'Decrypted Message';

//   modal.show();
// }


// copy from modal
// function copyModalResult() {
//   const text = $('modalResultText').value;

//   navigator.clipboard.writeText(text);

//   setStatus('Copied to clipboard!', 'ok');
// }


// ===============================
// MAIN ACTION BUTTON
// ===============================

async function process() {
  const message = $('message').value.trim();
  const password = $('password').value;

  if (!message) {
    setStatus('Enter a message', 'err');
    return;
  }

  if (!password) {
    setStatus('Enter a password', 'err');
    return;
  }

  const btn = $('actionBtn');
  btn.disabled = true;

  $('actionLabel').textContent =
    mode === 'encrypt' ? 'Encrypting...' : 'Decrypting...';

  try {
    let result;

    if (mode === 'encrypt') {
      result = await encryptText(message, password);

      // ✅ SHOW ENCRYPTED OUTPUT
      $('result').value = result;

      showModal({
        title: 'Encryption Successful',
        message: 'Your message has been securely encrypted.',
        type: 'success'
      });

    } else {
      result = await decryptText(message, password);

      // ✅ SHOW DECRYPTED OUTPUT
      $('result').value = result;

      showModal({
        title: 'Decryption Successful',
        message: 'Your message has been successfully decrypted.',
        type: 'success'
      });
    }

  } catch (error) {
    console.error(error);

    showModal({
      title: 'Error',
      message: 'Wrong password or corrupted data.',
      type: 'error'
    });
  }

  btn.disabled = false;

  $('actionLabel').textContent =
    mode === 'encrypt' ? 'Encrypt Message' : 'Decrypt Message';
}


// ===============================
// EXTRA UTILITIES
// ===============================

function clearAll() {
  $('message').value = '';
  $('result').value = '';
  $('password').value = '';
  $('strengthFill').style.width = '0%';
  setStatus('');
}

function copyResult() {
  const text = $('result').value;

  if (!text) {
    setStatus('Nothing to copy', 'err');
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => setStatus('Copied to clipboard!', 'info'))
    .catch(() => setStatus('Copy failed', 'err'));
}
// function copyModalResult() {
//   const text = document.getElementById('modalResultText').value;

//   navigator.clipboard.writeText(text);
// }

// shortcut: CTRL + ENTER
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    process();
  }
});