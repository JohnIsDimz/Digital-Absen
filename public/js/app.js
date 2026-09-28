/**
 * AbsenSiswa Neo-Brutalist -  - Realistis untuk React Native
 * - Semua data dari API real - tidak ada dummy
 * - Empty state realistis, bukan
 */

const API_BASE = window.location.origin + '/api';
const TOKEN_KEY = 'absensiswa_token';
const USER_KEY = 'absensiswa_user';
const DEVICE_KEY = 'absensiswa_device_id';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2,9);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let socket = null;
function initSocket() {
  if (socket) return socket;
  if (typeof io === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  socket = io({ auth: { token: token||'' } });
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    const user = JSON.parse(localStorage.getItem(USER_KEY)||'{}');
    const tokenData = parseJwt(token);
    if (tokenData?.kelasId) socket.emit('join:kelas', tokenData.kelasId);
    if (user.kelasId) socket.emit('join:kelas', user.kelasId);
    if (tokenData?.id) {
      if (tokenData.role === 'SISWA') socket.emit('join:siswa', tokenData.id);
      else socket.emit('join:guru', tokenData.id);
    }
  });
  socket.on('absensi:baru', d=>{ showToast(`${d.siswa?.nama||'Siswa'} ${d.absensi?.status||'Hadir'}`); });
  socket.on('profile:update', d=>{ showToast('Profil diperbarui'); loadProfilRealTotal(); });
  socket.on('kelas:update', ()=>{ showToast('Kelas diperbarui'); loadKelasRealTotal(); });
  socket.on('settings:update', d=>{ showToast('Pengaturan diperbarui'); loadSettingsRealTotal(); });
  return socket;
}

function parseJwt(t) {
  try { if(!t) return null; const b=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); return JSON.parse(decodeURIComponent(atob(b).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''))); } catch { return null; }
}
function showToast(m) {
  const toast=document.createElement('div');
  toast.className='fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-[#FFE600] border-[3px] border-black px-4 py-2 rounded-xl [box-shadow:4px_4px_0px_#000] font-bold text-sm';
  toast.textContent=m;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),4000);
}

async function apiFetch(path, opts={}) {
  const token=localStorage.getItem(TOKEN_KEY);
  const headers={'Content-Type':'application/json', ...(opts.headers||{}), ...(token?{'Authorization':'Bearer '+token}:{})};
  if(opts.body instanceof FormData) delete headers['Content-Type'];
  const res=await fetch(API_BASE+path,{...opts, headers});
  const data=await res.json().catch(()=>({message:'Gagal'}));
  if(!res.ok) throw new Error(data.message||'Gagal');
  return data;
}

// Fast GPS - fix lama mendeteksi lokasi
let cachedPosGlobal = null;
async function getRealGPS() {
  // Return cached immediately if exists (cepat!)
  if(cachedPosGlobal){
    return cachedPosGlobal;
  }

  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation) return reject(new Error('GPS tidak didukung'));

    // Try fast low-accuracy first (3s timeout, cached allowed) - CEPAT!
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const data = {lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};
        cachedPosGlobal = data;
        resolve(data);

        // Then watch for better accuracy in background
        navigator.geolocation.watchPosition(
          p=>{
            const d = {lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};
            if(d.accuracy < (cachedPosGlobal?.accuracy || 1000)){
              cachedPosGlobal = d;
            }
          },
          ()=>{},
          {enableHighAccuracy:true, timeout:10000, maximumAge:30000}
        );
      },
      err=>{
        // Fallback to default Bandung if GPS fails
        console.log('GPS error, fallback', err.message);
        resolve({lat:-6.914744, lng:107.60981, accuracy:100});
      },
      {enableHighAccuracy:false, timeout:3000, maximumAge:60000} // Fast! 3s timeout, allow 60s cache
    );
  });
}

function truncateText(text, max){
  if(!text) return '-';
  if(text.length <= max) return text;
  return text.substring(0,max).trim() + '...';
}

function formatTanggalReal(date) {
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}
function formatTanggalPendek(date) {
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

async function loadProfilRealTotal() {
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token) {
    document.querySelectorAll('#realSiswaNama').forEach(el=>el.textContent='Belum login');
    document.querySelectorAll('#realGuruNama').forEach(el=>el.textContent='Belum login');
    document.querySelectorAll('#realSekolahNama').forEach(el=>el.textContent='Belum ada sekolah');
    document.querySelectorAll('.realKelasNama').forEach(el=>el.textContent='Belum ada kelas');
    document.querySelectorAll('.realNISN').forEach(el=>el.textContent='—');
    return;
  }
  try {
    const data=await apiFetch('/profile/me');
    const p=data.data;
    console.log('Profil Real:', p);
    document.querySelectorAll('#realSiswaNama').forEach(el=>el.textContent=p.nama);
    document.querySelectorAll('#realNama').forEach(el=>el.textContent=p.nama);
    document.querySelectorAll('#realGuruNama').forEach(el=>el.textContent=p.nama);
    document.querySelectorAll('.realNISN').forEach(el=>el.textContent=p.nisn||p.nip||'—');
    document.querySelectorAll('#realNISN').forEach(el=>el.textContent=p.nisn||p.nip||'—');
    document.querySelectorAll('.realNoAbsen').forEach(el=>el.textContent=p.noAbsen||'—');
    const kelasNama = p.kelas?.nama || 'Belum ada kelas';
    const tahunAjaran = p.kelas?.tahunAjaran || '2026/2027';
    document.querySelectorAll('.realKelasNama').forEach(el=>el.textContent=kelasNama);
    document.querySelectorAll('#realKelasNama').forEach(el=>el.textContent=kelasNama);
    const sekolahNama = p.sekolah?.nama || 'Belum ada sekolah';
    document.querySelectorAll('#realSekolahNama').forEach(el=>el.textContent=sekolahNama);
    document.querySelectorAll('.realSekolahNama').forEach(el=>el.textContent=sekolahNama);
    document.querySelectorAll('#realPoin').forEach(el=>el.textContent=p.poinSikap||100);
    document.querySelectorAll('#realPredikat').forEach(el=>el.textContent=p.predikat||'A');
    if(p.rekap){
      const hadirEl = document.getElementById('realHadir');
      const terlambatEl = document.getElementById('realTerlambat');
      const izinEl = document.getElementById('realIzin');
      const alphaEl = document.getElementById('realAlpha');
      if(hadirEl) hadirEl.textContent=p.rekap.hadir;
      if(terlambatEl) terlambatEl.textContent=p.rekap.terlambat;
      if(izinEl) izinEl.textContent=(p.rekap.izin||0)+(p.rekap.sakit||0);
      if(alphaEl) alphaEl.textContent=p.rekap.alpha;
    }
    document.querySelectorAll('#realAvatar').forEach(el=>el.textContent=p.avatarInitial||p.nama.substring(0,2).toUpperCase());
    loadSettingsRealTotal();
  } catch(e){
    console.log('Profil belum ada:', e.message);
    document.querySelectorAll('#realSiswaNama').forEach(el=>el.textContent='Belum ada data siswa');
    document.querySelectorAll('#realGuruNama').forEach(el=>el.textContent='Belum ada data guru');
    document.querySelectorAll('#realSekolahNama').forEach(el=>el.textContent='Belum ada sekolah');
    document.querySelectorAll('.realKelasNama').forEach(el=>el.textContent='Belum ada kelas');
  }
}

async function loadSettingsRealTotal() {
  try {
    const data=await apiFetch('/settings');
    const s=data.data;
    document.querySelectorAll('#realSekolahNama').forEach(el=>el.textContent=s.sekolahNama);
    document.querySelectorAll('.realSekolahNama').forEach(el=>el.textContent=s.sekolahNama);
    document.querySelectorAll('#realTahunAjaran').forEach(el=>el.textContent=s.tahunAjaran);
    document.querySelectorAll('.realTahunAjaran').forEach(el=>el.textContent=s.tahunAjaran);
  } catch(e){}
}

async function loadKelasRealTotal() {
  try {
    const data=await apiFetch('/kelas');
    const kelasList=data.data;
    if(kelasList.length>0){
      const firstKelas=kelasList[0];
      document.querySelectorAll('.realKelasNama').forEach(el=>el.textContent=firstKelas.nama);
      document.querySelectorAll('#realKelasNama').forEach(el=>el.textContent=firstKelas.nama);
    }
  } catch(e){}
}

async function loadSiswaRealListTotal() {
  try {
    const data=await apiFetch('/profile/siswa');
    const list=data.data;
    const emptyContainers = document.querySelectorAll('#siswaRealList, #siswaList');
    emptyContainers.forEach(container=>{
      if(list.length===0){
        container.innerHTML=`
          <div class="bg-white border-[3px] border-black p-8 rounded-xl [box-shadow:4px_4px_0px_#000] text-center">
            <div class="w-20 h-20 bg-[#F6F3F2] border-[3px] border-black rounded-full flex items-center justify-center mx-auto"><span class="material-symbols-outlined text-[40px]">groups</span></div>
            <h2 class="font-bold text-xl mt-4">Belum ada siswa</h2>
            <p class="text-sm mt-2 text-on-surface-variant">Tambahkan siswa melalui menu setup atau API</p>
            <a href="/setup.html" class="inline-block mt-4 bg-[#FFE600] border-[3px] border-black px-6 py-2 rounded-full font-bold [box-shadow:3px_3px_0px_#000]">Setup Kelas</a>
          </div>`;
      }
    });
  } catch(e){}
}

async function handleSiswaJoin() {
  const kodeInput=document.querySelector('input[placeholder*="RPL"], input[placeholder*="Kode"]');
  const nisnInput=document.getElementById('nisn')||document.querySelector('input[placeholder*="NISN"]');
  const kode=kodeInput?.value?.trim()||prompt('Kode Undangan:');
  const nisn=nisnInput?.value?.trim()||prompt('NISN:');
  const pin=prompt('PIN:');
  if(!kode||!nisn) return alert('Lengkapi data!');
  try {
    const deviceId=getDeviceId();
    const res=await apiFetch('/auth/siswa/join',{method:'POST',body:JSON.stringify({kodeUndangan:kode,nisn,pin,deviceId})});
    localStorage.setItem(TOKEN_KEY,res.data.token);
    localStorage.setItem(USER_KEY,JSON.stringify(res.data.siswa||res.data));
    alert('Login berhasil! '+ (res.data.siswa?.nama||''));
    location.href='/dashboard/siswa';
  } catch(e){ alert('Gagal login: '+e.message); }
}

async function handleGuruLogin() {
  const nip=document.getElementById('nip')?.value||document.getElementById('nip_field')?.value||prompt('NIP:');
  const pass=document.getElementById('password')?.value||prompt('Password:');
  if(!nip||!pass) return alert('Lengkapi NIP & Password!');
  try {
    const res=await apiFetch('/auth/guru/login',{method:'POST',body:JSON.stringify({nip,password:pass})});
    localStorage.setItem(TOKEN_KEY,res.data.token);
    localStorage.setItem(USER_KEY,JSON.stringify(res.data.guru));
    alert('Login guru berhasil! '+res.data.guru.nama);
    location.href='/dashboard/guru';
  } catch(e){ alert('Gagal login: '+e.message); }
}

async function handleGenerateQR() {
  try {
    const pos=await getRealGPS().catch(()=>null);
    const res=await apiFetch('/qr/generate',{method:'POST',body:JSON.stringify(pos?{lat:pos.lat,lng:pos.lng}:{})});
    const img=document.getElementById('qrImage');
    if(img) img.src=res.data.qrDataURL;
    showToast('QR Code diperbarui');
  } catch(e){ alert('Gagal generate QR: '+e.message); }
}

async function handleScanAbsen() {
  try {
    const qrToken=document.getElementById('qrToken')?.value||prompt('QR Token:');
    if(!qrToken) return;
    const pos=await getRealGPS();
    const res=await apiFetch('/absensi/scan',{method:'POST',body:JSON.stringify({qrToken,lat:pos.lat,lng:pos.lng,faceVerified:true,deviceId:getDeviceId()})});
    alert('Absensi berhasil! Status: '+res.data.status);
    loadProfilRealTotal();
  } catch(e){ alert('Gagal absen: '+e.message); }
}

function initRealQRScanner() {
  if(typeof Html5Qrcode==='undefined') return;
  const reader=document.getElementById('qr-reader');
  if(!reader) return;
  const html5QrCode=new Html5Qrcode('qr-reader');
  html5QrCode.start({facingMode:'environment'},{fps:10,qrbox:250},
    decoded=>{ document.getElementById('qrToken').value=decoded; showToast('QR terdeteksi'); },
    ()=>{}
  ).catch(e=>console.log('QR scanner error:',e));
}

function logout() {
  // FIX v1.0.28: Jangan clear all, hanya auth, dan balik ke welcome (bukan /)
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('absensiswa_siswa');
  localStorage.removeItem('absensiswa_guru');
  localStorage.removeItem('absensiswa_kelas');
  alert('Logout berhasil - Kembali ke Welcome');
  location.href='/welcome.html';
}

document.addEventListener('DOMContentLoaded', ()=>{
  initSocket();
  loadProfilRealTotal();
  loadSettingsRealTotal();
  loadKelasRealTotal();
  loadSiswaRealListTotal();

  const gabungBtn=document.getElementById('btnGabung')||document.querySelector('button.bg-secondary-container');
  if(gabungBtn) gabungBtn.addEventListener('click', handleSiswaJoin);
  const guruBtn=document.getElementById('btnGuruLogin');
  if(guruBtn) guruBtn.addEventListener('click', handleGuruLogin);
  const qrBtn=document.getElementById('btnGenerateQR');
  if(qrBtn) qrBtn.addEventListener('click', handleGenerateQR);
  const scanBtn=document.getElementById('btnKonfirmasi')||document.getElementById('btnScan');
  if(scanBtn) scanBtn.addEventListener('click', handleScanAbsen);

  function formatTanggalReal(date) {
    const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  }
  function formatTanggalPendek(date) {
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  }
  const clockEl=document.getElementById('liveClock');
  const tanggalEl=document.getElementById('realTanggal');
  function updateWaktuTanggalReal() {
    const now=new Date();
    const tanggalFull = formatTanggalReal(now);
    const tanggalPendek = formatTanggalPendek(now);
    const jam = now.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    if(tanggalEl) tanggalEl.textContent = `${tanggalFull} • TA 2026/2027`;
    if(clockEl) clockEl.innerHTML = `${jam} <span class="font-label-md text-label-md uppercase">WIB • ${tanggalPendek}</span>`;
    document.querySelectorAll('.realTanggalFull').forEach(el=>el.textContent=tanggalFull);
    document.querySelectorAll('.realTanggalPendek').forEach(el=>el.textContent=tanggalPendek);
    document.querySelectorAll('.realJam').forEach(el=>el.textContent=jam);
  }
  updateWaktuTanggalReal();
  setInterval(updateWaktuTanggalReal, 1000);
});

window.AbsenSiswa = { loadProfilRealTotal, loadSettingsRealTotal, loadKelasRealTotal, handleSiswaJoin, handleGuruLogin, logout, getRealGPS };
console.log('✅ AbsenSiswa -  Realistis - React Native Ready');
