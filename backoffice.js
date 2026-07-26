(async function() {
  // ===== INIT SUPABASE =====
  // GUNakan service role key untuk backoffice (simpan di environment variable)
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ===== STATE =====
  let rewardOptions = [];

  // ===== DOM =====
  const tbody = document.getElementById('tableBody');
  const usernameInput = document.getElementById('usernameInput');
  const rewardSelect = document.getElementById('rewardSelect');
  const generateBtn = document.getElementById('generateBtn');
  const toast = document.getElementById('toastMessage');
  const toastText = document.getElementById('toastText');
  const previewUsername = document.getElementById('previewUsername');
  const previewCode = document.getElementById('previewCode');
  const rewardList = document.getElementById('rewardList');
  const newRewardInput = document.getElementById('newRewardInput');
  const addRewardBtn = document.getElementById('addRewardBtn');

  // ===== HELPERS =====
  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value);
  }

  function getTodayDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SEAL77-${rand}`;
  }

  function showToast(message, type = 'success') {
    toastText.textContent = message;
    toast.className = 'toast show';
    const icon = toast.querySelector('i');
    if (type === 'error') {
      toast.style.borderColor = '#ff7a7a';
      icon.className = 'fas fa-exclamation-circle';
      icon.style.color = '#ff7a7a';
    } else if (type === 'info') {
      toast.style.borderColor = '#6e7694';
      icon.className = 'fas fa-info-circle';
      icon.style.color = '#b9ae8f';
    } else {
      toast.style.borderColor = '#f5b82e60';
      icon.className = 'fas fa-check-circle';
      icon.style.color = '#7ae6a0';
    }
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // ===== LOAD DATA DARI SUPABASE =====
  async function loadRewardOptions() {
    const { data, error } = await supabase
      .from('reward_options')
      .select('amount')
      .order('amount', { ascending: true });

    if (error) {
      console.error('Error loading rewards:', error);
      return [];
    }

    return data.map(item => item.amount);
  }

  async function loadSpinCodes() {
    const { data, error } = await supabase
      .from('spin_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading codes:', error);
      return [];
    }

    return data.map(item => ({
      ...item,
      created: new Date(item.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }));
  }

  // ===== RENDER FUNCTIONS =====
  function renderRewardSelect() {
    rewardSelect.innerHTML = '';
    rewardOptions.sort((a, b) => a - b);
    rewardOptions.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = formatRupiah(val);
      rewardSelect.appendChild(opt);
    });
  }

  function renderRewardChips() {
    rewardList.innerHTML = '';
    rewardOptions.sort((a, b) => a - b);
    rewardOptions.forEach(val => {
      const chip = document.createElement('span');
      chip.className = 'reward-chip';
      chip.innerHTML = `${formatRupiah(val)} <span class="remove-reward" data-value="${val}"><i class="fas fa-times"></i></span>`;
      rewardList.appendChild(chip);
    });

    document.querySelectorAll('.remove-reward').forEach(el => {
      el.addEventListener('click', async function() {
        const val = parseInt(this.dataset.value, 10);
        if (rewardOptions.length <= 1) {
          showToast('⚠️ Minimal 1 reward', 'error');
          return;
        }

        // Hapus dari database
        const { error } = await supabase
          .from('reward_options')
          .delete()
          .eq('amount', val);

        if (error) {
          showToast('❌ Gagal menghapus reward', 'error');
          return;
        }

        rewardOptions = rewardOptions.filter(v => v !== val);
        renderRewardSelect();
        renderRewardChips();
        showToast('Reward dihapus', 'info');
      });
    });
  }

  async function renderTable() {
    const codes = await loadSpinCodes();
    if (!tbody) return;

    if (codes.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Belum ada kode. Buat kode baru!</td></tr>`;
      return;
    }

    let html = '';
    codes.forEach((item, idx) => {
      const statusClass = item.status === 'used' ? 'used' : 'active';
      const statusLabel = item.status === 'used' ? 'USED' : 'ACTIVE';
      const rewardFormatted = formatRupiah(item.reward);
      html += `
        <tr>
          <td><strong style="color: #b9ae8f;">${item.username}</strong></td>
          <td><span style="color: #f5d77a; font-weight: 600; font-family: 'Courier New', monospace;">${item.code}</span></td>
          <td>${rewardFormatted}</td>
          <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
          <td class="text-muted">${item.created || '-'}</td>
          <td style="text-align: right;">
            <button class="btn-delete" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Delete</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.dataset.id;
        if (confirm(`Hapus kode ini?`)) {
          const { error } = await supabase
            .from('spin_codes')
            .delete()
            .eq('id', id);

          if (error) {
            showToast('❌ Gagal menghapus kode', 'error');
          } else {
            renderTable();
            showToast('Kode dihapus', 'info');
          }
        }
      });
    });
  }

  function updatePreview(username, code) {
    previewUsername.textContent = username || '—';
    if (code) {
      previewCode.textContent = code;
      previewCode.className = 'preview-code';
    } else {
      previewCode.innerHTML = `<i class="fas fa-hourglass-half" style="margin-right: 8px;"></i> Belum ada`;
      previewCode.className = 'preview-code empty';
    }
  }

  // ===== GENERATE CODE =====
  async function generateCode() {
    const username = usernameInput.value.trim();
    if (!username) {
      showToast('⚠️ Masukkan Username terlebih dahulu', 'error');
      return;
    }

    const reward = parseInt(rewardSelect.value, 10);
    if (isNaN(reward) || reward <= 0) {
      showToast('⚠️ Pilih reward yang valid', 'error');
      return;
    }

    // Generate unique code
    let code = generateRandomCode();
    let exists = true;
    let retry = 0;
    while (exists && retry < 20) {
      const { data } = await supabase
        .from('spin_codes')
        .select('code')
        .eq('code', code)
        .single();
      exists = !!data;
      if (exists) {
        code = generateRandomCode();
        retry++;
      }
    }

    if (retry >= 20) {
      showToast('⚠️ Gagal generate kode unik', 'error');
      return;
    }

    // Insert ke database
    const { data, error } = await supabase
      .from('spin_codes')
      .insert({
        code: code,
        username: username,
        reward: reward,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      showToast('❌ Gagal menyimpan kode', 'error');
      console.error(error);
      return;
    }

    updatePreview(username, code);
    usernameInput.value = '';
    await renderTable();
    showToast(`✅ Kode ${code} dibuat untuk ${username}`, 'success');
  }

  // ===== ADD REWARD =====
  async function addReward() {
    const val = parseInt(newRewardInput.value.trim(), 10);
    if (isNaN(val) || val <= 0) {
      showToast('⚠️ Masukkan nominal reward yang valid', 'error');
      return;
    }
    if (rewardOptions.includes(val)) {
      showToast('⚠️ Reward sudah ada', 'error');
      return;
    }

    // Insert ke database
    const { error } = await supabase
      .from('reward_options')
      .insert({ amount: val });

    if (error) {
      showToast('❌ Gagal menambah reward', 'error');
      return;
    }

    rewardOptions.push(val);
    renderRewardSelect();
    renderRewardChips();
    newRewardInput.value = '';
    showToast(`✅ Reward ${formatRupiah(val)} ditambahkan`, 'success');
  }

  // ===== INIT =====
  async function init() {
    rewardOptions = await loadRewardOptions();
    renderRewardSelect();
    renderRewardChips();
    await renderTable();
    updatePreview('', null);

    // Events
    generateBtn.addEventListener('click', generateCode);
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') generateBtn.click();
    });
    addRewardBtn.addEventListener('click', addReward);
    newRewardInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addRewardBtn.click();
    });

    showToast('📋 Backoffice siap', 'info');
  }

  init();
})();