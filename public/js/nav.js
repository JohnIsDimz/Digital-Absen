/**
 * Digital Apsen - Dynamic Bottom Nav v1.0.34 FINAL STABLE
 * FIX: Nav 4 jadi 5 (flicker) + Guru 5 nav tanpa Dash
 * - Build sekali saja, tidak retry yang bikin 4->5
 * - Deteksi role sync langsung, fallback path untuk hindari null
 */

function getRoleForNavRobust(){
  // 1. Dari AuthGuard
  try{
    if(window.AuthGuard && window.AuthGuard.getRole){
      const r = window.AuthGuard.getRole();
      if(r) return r;
    }
  }catch(e){}

  // 2. Dari token JWT
  try{
    const token = localStorage.getItem('absensiswa_token');
    if(token && token.trim() !== '' && token !== 'null' && token !== 'undefined'){
      const parts = token.split('.');
      if(parts.length === 3){
        let base64 = parts[1].replace(/-/g,'+').replace(/_/g,'/');
        const pad = base64.length % 4;
        if(pad) base64 += '='.repeat(4 - pad);
        const json = decodeURIComponent(atob(base64).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(json);
        if(payload && payload.role) return payload.role;
      }
    }
  }catch(e){}

  // 3. Fallback dari localStorage + path (untuk hindari flicker 4->5)
  const hasGuru = localStorage.getItem('absensiswa_guru');
  const hasSiswa = localStorage.getItem('absensiswa_siswa');
  const path = window.location.pathname;

  // Jika ada keduanya, tentukan dari path
  if(hasGuru && hasSiswa){
    const guruPaths = ['/dashboard-guru.html', '/kelas.html', '/siswa.html', '/settings.html'];
    if(guruPaths.includes(path)) return 'GURU';
    return 'SISWA';
  }
  if(hasGuru) return 'GURU';
  if(hasSiswa) return 'SISWA';

  // 4. Fallback terakhir dari path saja (untuk cegah nav kosong)
  const guruPaths = ['/dashboard-guru.html', '/kelas.html', '/siswa.html', '/settings.html'];
  const siswaPaths = ['/dashboard-siswa.html', '/scan.html', '/izin.html', '/profil.html', '/verifikasi-nik.html', '/rekap.html'];
  if(guruPaths.includes(path)) return 'GURU';
  if(siswaPaths.includes(path)) return 'SISWA';

  return null;
}

function buildNav(){
  const path = window.location.pathname;
  const role = getRoleForNavRobust();
  const isGuru = role && ['GURU','WALI_KELAS','ADMIN'].includes(role);

  let items = [];
  if(isGuru){
    // GURU: 5 nav tetap, tidak berubah-ubah (fix 4->5)
    items = [
      { href: '/dashboard-guru.html', icon: 'supervisor_account', label: 'Guru' },
      { href: '/kelas.html', icon: 'class', label: 'Kelas' },
      { href: '/siswa.html', icon: 'groups', label: 'Siswa' },
      { href: '/rekap.html', icon: 'analytics', label: 'Rekap' },
      { href: '/settings.html', icon: 'settings', label: 'Setting' }
    ];
  } else {
    // SISWA: 4 nav tetap
    items = [
      { href: '/dashboard-siswa.html', icon: 'dashboard', label: 'Siswa' },
      { href: '/scan.html', icon: 'qr_code_scanner', label: 'Scan' },
      { href: '/rekap.html', icon: 'analytics', label: 'Rekap' },
      { href: '/profil.html', icon: 'person', label: 'Profil' }
    ];
    if(path === '/izin.html'){
      items[3] = { href: '/izin.html', icon: 'assignment', label: 'Izin' };
    } else if(path === '/verifikasi-nik.html'){
      items[3] = { href: '/verifikasi-nik.html', icon: 'badge', label: 'NIK' };
    }
  }

  const nav = document.getElementById('bottomNav');
  if(!nav) return;

  const publicPages = ['/', '/index.html', '/welcome.html', '/login-siswa.html', '/login-guru.html', '/daftar-guru.html', '/lupa-password-guru.html', '/setup.html'];
  if(!role && publicPages.includes(path)){
    nav.style.display = 'none';
    return;
  }

  nav.style.display = 'flex';
  nav.className = isGuru
    ? 'fixed bottom-0 w-full max-w-[420px] md:max-w-[440px] bg-white border-t-[3px] border-black flex justify-around py-2 z-50 left-1/2 -translate-x-1/2 gap-1 px-1'
    : 'fixed bottom-0 w-full max-w-[420px] md:max-w-[440px] bg-white border-t-[3px] border-black flex justify-around py-2 z-50 left-1/2 -translate-x-1/2';

  nav.innerHTML = items.map(item => {
    const isActive = path === item.href;
    const baseColor = isGuru ? 'bg-[#8A4CFC] text-white' : 'bg-[#67FFB7] text-black';
    const activeClass = isActive
      ? `flex flex-col items-center ${baseColor} border-[2px] border-black rounded-xl px-3 py-1`
      : `flex flex-col items-center opacity-60 px-2 py-1 hover:opacity-100 transition-opacity`;
    const labelClass = isActive ? 'text-[8px] font-black uppercase' : 'text-[8px] font-bold uppercase';
    const iconSize = isGuru ? 'text-[18px]' : 'text-[20px]';
    return `<a href="${item.href}" class="${activeClass}"><span class="material-symbols-outlined ${iconSize}">${item.icon}</span><span class="${labelClass}">${item.label}</span></a>`;
  }).join('');

  console.log('🧭 Nav v1.0.34 STABLE:', {role, path, count: items.length, nav: items.map(i=>i.label).join(',')});
}

// Build sekali saja saat DOM ready, tidak retry berkali-kali (fix 4->5 flicker)
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', buildNav);
} else {
  buildNav();
}

window.buildBottomNav = buildNav;
console.log('🧭 Nav.js v1.0.34 STABLE loaded - Fix 4->5 flicker, Guru 5 nav tanpa Dash');
