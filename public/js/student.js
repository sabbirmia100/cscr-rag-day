const API_BASE = '/api';

const form = document.getElementById('registrationForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const spinner = document.getElementById('spinner');
const paymentTimeInput = document.getElementById('payment_time');
const screenshotInput = document.getElementById('screenshot');
const uploadArea = document.getElementById('uploadArea');
const uploadContent = document.getElementById('uploadContent');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');
const removeFileBtn = document.getElementById('removeFile');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const initSmoothScroll = () => {
  if (prefersReducedMotion.matches) return;
  if (typeof window.Lenis !== 'function') return;

  const lenis = new window.Lenis({
    duration: 1.05,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };

  requestAnimationFrame(raf);
};

const initCursorEffect = () => {
  if (prefersReducedMotion.matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let visible = false;

  const tick = () => {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    requestAnimationFrame(tick);
  };

  window.addEventListener('mousemove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) {
      glow.style.opacity = '1';
      visible = true;
    }
  });

  window.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
    visible = false;
  });

  requestAnimationFrame(tick);
};

initSmoothScroll();
initCursorEffect();

const toDateTimeLocal = (date) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

const stampPaymentTime = () => {
  paymentTimeInput.value = toDateTimeLocal(new Date());
};

stampPaymentTime();
setInterval(stampPaymentTime, 30000);

screenshotInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showAlert('error', 'File size must be less than 5MB.');
    screenshotInput.value = '';
    return;
  }

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      uploadContent.classList.add('hidden');
      uploadPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    previewImg.src = '';
    previewImg.alt = file.name;
    uploadContent.classList.add('hidden');
    uploadPreview.classList.remove('hidden');
  }
}

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  if (e.dataTransfer.files.length) {
    screenshotInput.files = e.dataTransfer.files;
    handleFileSelect({ target: screenshotInput });
  }
});

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  screenshotInput.value = '';
  previewImg.src = '';
  uploadContent.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
});

const validators = {
  name: { required: true, label: 'Student Name' },
  roll: { required: true, label: 'Roll Number' },
  section: { required: true, label: 'Section' },
  department: { required: true, label: 'Department' },
  email: {
    required: true,
    label: 'Email Address',
    pattern: /^\S+@\S+\.\S+$/,
    patternMsg: 'Enter a valid email.',
  },
  tshirt_size: { required: true, label: 'T-shirt Size' },
  transaction_id: { required: true, label: 'Transaction ID' },
  payment_time: { required: true, label: 'Payment Time' },
};

function validateField(id) {
  const el = document.getElementById(id);
  const errEl = document.getElementById(id + 'Error');
  const rules = validators[id];
  if (!el || !errEl || !rules) return true;

  const val = el.value.trim();
  let error = '';

  if (rules.required && !val) {
    error = rules.label + ' is required.';
  } else if (rules.pattern && val && !rules.pattern.test(val)) {
    error = rules.patternMsg || ('Invalid ' + rules.label + '.');
  }

  errEl.textContent = error;
  el.classList.toggle('invalid', Boolean(error));
  return !error;
}

function validateAll() {
  return Object.keys(validators).map(validateField).every(Boolean);
}

Object.keys(validators).forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('blur', () => validateField(id));
  }
});

function showAlert(type, message) {
  alertBox.className = 'alert ' + type;
  alertBox.innerHTML = '<span>' + (type === 'success' ? 'OK' : 'ERR') + '</span><span>' + message + '</span>';
  alertBox.classList.remove('hidden');
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (type === 'success') {
    setTimeout(() => alertBox.classList.add('hidden'), 8000);
  }
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.classList.toggle('hidden', loading);
  spinner.classList.toggle('hidden', !loading);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.classList.add('hidden');

  stampPaymentTime();

  if (!validateAll()) {
    showAlert('error', 'Please fix the errors above before submitting.');
    return;
  }

  const formData = new FormData(form);
  setLoading(true);

  try {
    const response = await fetch(API_BASE + '/register', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showAlert('success', 'Registration submitted successfully. Please wait for confirmation email.');
      form.reset();
      stampPaymentTime();
      uploadContent.classList.remove('hidden');
      uploadPreview.classList.add('hidden');
      previewImg.src = '';

      Object.keys(validators).forEach((id) => {
        const errEl = document.getElementById(id + 'Error');
        const el = document.getElementById(id);
        if (errEl) errEl.textContent = '';
        if (el) el.classList.remove('invalid');
      });
    } else {
      showAlert('error', data.message || 'Submission failed. Please try again.');
    }
  } catch (err) {
    console.error('Submit error:', err);
    showAlert('error', 'Network error. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
});
