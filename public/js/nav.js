/**
 * Digital Apsen - Dynamic Bottom Nav v1.0.29
 * FIX: Navigasi guru & siswa tercampur, tombol mengarah ke lain
 * Guru nav: Guru, Kelas, Rekap, Setting
 * Siswa nav: Siswa, Scan, Rekap, Profil
 */

function getRoleForNav(){
  try{
    const token = localStorage.getItem('absensiswa_token');
    if(!token || token.trim() === '' || token === 'null') return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g,'+').replace(/_/g,'/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const jsonPayload = decodeURIComponent(atob(padded).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.role || null;
  }catch(e){ return null; }
}

function buildNav(){
  const path = window.location.pathname;
  const role = getRoleForNav();
  const isGuru = role && ['GURU','WALI_KELAS','ADMIN'].includes(role);
  const isSiswa = role === 'SISWA';

  // Tentukan nav items berdasarkan role
  let items = [];
  if(isGuru){
    // GURU NAV: Guru, Kelas, Rekap, Setting (sesuai permintaan user)
    items = [
      { href: '/dashboard-guru.html', icon: 'supervisor_account', label: 'Guru', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/kelas.html', icon: 'groups', label: 'Kelas', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/rekap.html', icon: 'analytics', label: 'Rekap', activeColor: 'bg-[#8A4CFC] text-white' },
      { href: '/settings.html', icon: 'settings', label: 'Set', activeColor: 'bg-[#8A4CFC] text-white' }
    ];
  } else {
    // SISWA NAV: Siswa, Scan, Rekap, Profil (default untuk siswa & public)
    // Untuk halaman izin & verifikasi-nik, tetap pakai siswa nav tapi active disesuaikan
    items = [
      { href: '/dashboard-siswa.html', icon: 'dashboard', label: 'Siswa', activeColor: 'bg-[#67FFB7] text-black' },
      { href: '/scan.html', icon: 'qr_code_scanner', label: 'Scan', activeColor: 'bg-[#67FFB7] text-black' },
      { href: '/rekap.html', icon: 'analytics', label: 'Rekap', activeColor: 'bg-[#67FFB7] text-black' },
      { href: '/profil.html', icon: 'person', label: 'Profil', activeColor: 'bg-[#67FFB7] text-black' }
    ];

    // Khusus untuk halaman izin & verifikasi, ganti Profil jadi Izin atau NIK biar active jelas
    if(path === '/izin.html'){
      items[3] = { href: '/izin.html', icon: 'assignment', label: 'Izin', activeColor: 'bg-[#67FFB7] text-black' };
    } else if(path === '/verifikasi-nik.html'){
      items[3] = { href: '/verifikasi-nik.html', icon: 'badge', label: 'NIK', activeColor: 'bg-[#67FFB7] text-black' };
    }
  }

  // Build HTML
  const nav = document.getElementById('bottomNav');
  if(!nav) return;

  // Jika tidak ada role (belum login), jangan tampilkan nav di halaman public (welcome, login, setup, index)
  const publicPages = ['/', '/index.html', '/welcome.html', '/login-siswa.html', '/login-guru.html', '/daftar-guru.html', '/lupa-password-guru.html', '/setup.html'];
  if(!role && publicPages.includes(path)){
    nav.style.display = 'none';
    return;
  }

  nav.className = 'fixed bottom-0 w-full max-w-[420px] md:max-w-[440px] bg-white border-t-[3px] border-black flex justify-around py-2 z-50 left-1/2 -translate-x-1/2';
  nav.innerHTML = items.map(item => {
    const isActive = path === item.href || (path === '/' && item.href.includes('dashboard'));
    const activeClass = isActive 
      ? `flex flex-col items-center ${item.activeColor} border-[2px] border-black rounded-xl px-4 py-1`
      : `flex flex-col items-center opacity-60 px-3 py-1 hover:opacity-100 transition-opacity`;
    const labelClass = isActive ? 'text-[9px] font-black uppercase' : 'text-[9px] font-bold uppercase';
    return `<a href="${item.href}" class="${activeClass}"><span class="material-symbols-outlined text-[20px]">${item.icon}</span><span class="${labelClass}">${item.label}</span></a>`;
  }).join('');

  console.log('🧭 Nav built:', role, path, items.map(i=>i.label).join(', '));
}

// Jalankan saat DOM ready & setelah auth guard
document.addEventListener('DOMContentLoaded', ()=>{
  // Delay sedikit biar token sudah ada
  setTimeout(buildNav, 100);
});

// Juga expose untuk dipanggil manual
window.buildBottomNav = buildNav;
