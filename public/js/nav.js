/**
 * Digital Apsen - Dynamic Bottom Nav v1.0.32 FINAL
 * FIX: Guru harusnya 5 nav: Guru, Kelas, Siswa, Rekap, Setting (bukan 4, dan tanpa Dash)
 */

function getRoleForNavRobust(){
  try{
    if(window.AuthGuard && window.AuthGuard.getRole){
      const r = window.AuthGuard.getRole();
      if(r) return r;
    }
  }catch(e){}

  try{
    const token = localStorage.getItem('absensiswa_token');
    if(!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      const hasGuru = localStorage.getItem('absensiswa_guru');
      const hasSiswa = localStorage.getItem('absensiswa_siswa');
      if(hasGuru && !hasSiswa) return 'GURU';
      if(hasSiswa && !hasGuru) return 'SISWA';
      return null;
    }
    const parts = token.split('.');
    if(parts.length !== 3) return null;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g,'+').replace(/_/g,'/');
    const pad = base64.length % 4;
    if(pad) base64 += '='.repeat(4 - pad);
    const json = decodeURIComponent(atob(base64).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const payload = JSON.parse(json);
    if(payload && payload.role) return payload.role;
    
    const hasGuru = localStorage.getItem('absensiswa_guru');
    const hasSiswa = localStorage.getItem('absensiswa_siswa');
    if(hasGuru) return 'GURU';
    if(hasSiswa) return 'SISWA';
    return null;
  }catch(e){
    const hasGuru = localStorage.getItem('absensiswa_guru');
    const hasSiswa = localStorage.getItem('absensiswa_siswa');
    if(hasGuru && !hasSiswa) return 'GURU';
    if(hasSiswa && !hasGuru) return 'SISWA';
    if(hasGuru) return 'GURU';
    return null;
  }
}

function buildNav(){
  const path = window.location.pathname;
  let role = getRoleForNavRobust();
  
  if(!role){
    const guruPaths = ['/dashboard-guru.html', '/kelas.html', '/siswa.html', '/settings.html', '/export.html'];
    const siswaPaths = ['/dashboard-siswa.html', '/scan.html', '/izin.html', '/profil.html', '/verifikasi-nik.html'];
    if(guruPaths.includes(path)){
      const hasGuru = localStorage.getItem('absensiswa_guru');
      if(hasGuru) role = 'GURU';
    }
    if(siswaPaths.includes(path)){
      const hasSiswa = localStorage.getItem('absensiswa_siswa');
      if(hasSiswa) role = 'SISWA';
    }
  }

  const isGuru = role && ['GURU','WALI_KELAS','ADMIN'].includes(role);

  let items = [];
  if(isGuru){
    // GURU NAV FINAL: 5 item - Guru, Kelas, Siswa, Rekap, Setting (tanpa Dash, sesuai permintaan user)
    items = [
      { href: '/dashboard-guru.html', icon: 'supervisor_account', label: 'Guru', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/kelas.html', icon: 'class', label: 'Kelas', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/siswa.html', icon: 'groups', label: 'Siswa', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/rekap.html', icon: 'analytics', label: 'Rekap', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/settings.html', icon: 'settings', label: 'Setting', activeColor: 'bg-[#8A4CFC] text-white' }
    ];
  } else {
    // SISWA NAV: 4 item - Siswa, Scan, Rekap, Profil
    items = [
      { href: '/dashboard-siswa.html', icon: 'dashboard', label: 'Siswa', activeColor: 'bg-[#67FFB7] text-black' },
      { href: '/scan.html', icon: 'qr_code_scanner', label: 'Scan', activeColor: 'bg-[#67FFB7] text-black' },
      { href: '/rekap.html', icon: 'analytics', label: 'Rekap', activeColor: 'bg-[#67FFB7] text-black' },
      { href: '/profil.html', icon: 'person', label: 'Profil', activeColor: 'bg-[#67FFB7] text-black' }
    ];
    if(path === '/izin.html'){
      items[3] = { href: '/izin.html', icon: 'assignment', label: 'Izin', activeColor: 'bg-[#67FFB7] text-black' };
    } else if(path === '/verifikasi-nik.html'){
      items[3] = { href: '/verifikasi-nik.html', icon: 'badge', label: 'NIK', activeColor: 'bg-[#67FFB7] text-black' };
    }
  }

  const nav = document.getElementById('bottomNav');
  if(!nav){
    return;
  }

  const publicPages = ['/', '/index.html', '/welcome.html', '/login-siswa.html', '/login-guru.html', '/daftar-guru.html', '/lupa-password-guru.html', '/setup.html'];
  if(!role && publicPages.includes(path)){
    nav.style.display = 'none';
    return;
  }

  nav.style.display = 'flex';
  // Untuk 5 item guru, padding lebih kecil biar muat
  const isGuruNav = isGuru;
  nav.className = isGuruNav 
    ? 'fixed bottom-0 w-full max-w-[420px] md:max-w-[440px] bg-white border-t-[3px] border-black flex justify-around py-2 z-50 left-1/2 -translate-x-1/2 gap-1 px-1'
    : 'fixed bottom-0 w-full max-w-[420px] md:max-w-[440px] bg-white border-t-[3px] border-black flex justify-around py-2 z-50 left-1/2 -translate-x-1/2';

  nav.innerHTML = items.map(item => {
    const isActive = path === item.href;
    const activeClass = isActive 
      ? `flex flex-col items-center ${item.activeColor} border-[2px] border-black rounded-xl px-3 py-1`
      : `flex flex-col items-center opacity-60 px-2 py-1 hover:opacity-100 transition-opacity`;
    const labelClass = isActive ? 'text-[8px] font-black uppercase' : 'text-[8px] font-bold uppercase';
    return `<a href="${item.href}" class="${activeClass}"><span class="material-symbols-outlined text-[18px]">${item.icon}</span><span class="${labelClass}">${item.label}</span></a>`;
  }).join('');

  console.log('🧭 Nav v1.0.32:', {role, path, nav: items.map(i=>i.label).join(',')});
}

function initNav(){
  buildNav();
  setTimeout(buildNav, 500);
  setTimeout(buildNav, 1500);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initNav);
} else {
  initNav();
}

window.buildBottomNav = buildNav;
console.log('🧭 Nav.js v1.0.32 loaded - Guru 5 nav: Guru,Kelas,Siswa,Rekap,Setting tanpa Dash');
