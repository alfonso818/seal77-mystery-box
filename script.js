(async function() {
  // ===== INIT SUPABASE =====
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== STATE =====
  let isOpened = false;
  let isProcessing = false;

  // ===== DOM =====
  const giftBox = document.getElementById('giftBox');
  const giftWrapper = document.getElementById('giftWrapper');
  const codeInput = document.getElementById('codeInput');
  const openBtn = document.getElementById('openBtn');
  const statusMessage = document.getElementById('statusMessage');
  const rewardText = document.getElementById('rewardText');
  const rewardValue = document.getElementById('rewardValue');
  const emptyReward = document.getElementById('emptyReward');
  const confettiContainer = document.getElementById('confettiContainer');
  const confettiOverlay = document.getElementById('confettiOverlay');

  // ===== HELPERS =====
  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value);
  }

  function setStatus(msg, type = 'info') {
    const span = statusMessage.querySelector('span') || document.createElement('span');
    span.textContent = msg;
    span.className = type;
    statusMessage.innerHTML = '';
    statusMessage.appendChild(span);
  }

  // ===== CONFETTI =====
  function triggerConfetti(count = 60) {
    // ... (sama seperti di LS_USER.html)
    const colors = ['#f5b82e', '#f94144', '#f3722c', '#f9c74f', '#43aa8b', '#577590', '#f5d77a', '#ff6b6b', '#ffd93d', '#6bcb77'];
    const rect = giftBox.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const size = 6 + Math.random() * 10;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 60 + Math.random() * 140;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 30;
      el.style.cssText = `
        width: ${size}px;
        height: ${size * (0.6 + Math.random() * 0.8)}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: 50%;
        top: 50%;
        --tx: ${tx}px;
        --ty: ${ty}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${0.8 + Math.random() * 0.6}s;
        animation-delay: ${Math.random() * 0.2}s;
      `;
      confettiContainer.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }

    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'piece';
      const size = 6 + Math.random() * 10;
      const x = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const duration = 2 + Math.random() * 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = `
        left: ${x}%;
        top: -20px;
        width: ${size}px;
        height: ${size * (0.5 + Math.random() * 0.8)}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      confettiOverlay.appendChild(el);
      setTimeout(() => el.remove(), (duration + delay) * 1000 + 500);
    }
  }

  // ===== OPEN GIFT (DENGAN SUPABASE) =====
  async function openGift(code) {
    if (isOpened || isProcessing) return;

    isProcessing = true;
    openBtn.disabled = true;

    try {
      // Cek kode di database
      const { data: codeData, error: checkError } = await supabase
        .from('spin_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (checkError || !codeData) {
        setStatus('❌ Kode tidak ditemukan', 'error');
        isProcessing = false;
        openBtn.disabled = false;
        return;
      }

      if (codeData.status === 'used') {
        setStatus('❌ Kode sudah digunakan', 'error');
        isProcessing = false;
        openBtn.disabled = false;
        return;
      }

      // Update status menjadi 'used'
      const { error: updateError } = await supabase
        .from('spin_codes')
        .update({ status: 'used' })
        .eq('code', code);

      if (updateError) {
        setStatus('❌ Gagal mengupdate kode', 'error');
        isProcessing = false;
        openBtn.disabled = false;
        return;
      }

      // Animasi buka kado
      giftBox.classList.add('opened');
      isOpened = true;

      setTimeout(() => {
        rewardValue.textContent = formatRupiah(codeData.reward);
        rewardText.classList.add('show');
        emptyReward.style.display = 'none';
        setStatus(`🎉 Selamat! Anda mendapat ${formatRupiah(codeData.reward)}`, 'success');
        triggerConfetti(80);
        isProcessing = false;
        openBtn.disabled = false;
      }, 600);

      codeInput.value = '';

    } catch (error) {
      console.error('Error:', error);
      setStatus('❌ Terjadi kesalahan', 'error');
      isProcessing = false;
      openBtn.disabled = false;
    }
  }

  // ===== HANDLE OPEN =====
  function handleOpen() {
    if (isOpened) {
      setStatus('🎁 Kado sudah dibuka!', 'info');
      return;
    }

    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
      setStatus('⚠️ Masukkan kode terlebih dahulu', 'error');
      codeInput.focus();
      return;
    }

    if (!/^SEAL77-[A-Z0-9]{5}$/.test(code)) {
      setStatus('⚠️ Format kode salah. Gunakan SEAL77-XXXXX', 'error');
      return;
    }

    openGift(code);
  }

  // ===== EVENTS =====
  openBtn.addEventListener('click', handleOpen);
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleOpen();
    }
  });

  codeInput.addEventListener('input', function() {
    const start = this.selectionStart;
    const end = this.selectionEnd;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(start, end);
  });

  giftWrapper.addEventListener('click', function() {
    if (isOpened) {
      triggerConfetti(40);
      return;
    }
    codeInput.focus();
  });

  // ===== INIT =====
  setStatus('⌨️ Masukkan kode untuk membuka kado', 'info');
  console.log('🎁 Kado Misteri SEAL77 siap!');
})();