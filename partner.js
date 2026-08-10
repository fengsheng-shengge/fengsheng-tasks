/* partner.js —— 路径B 合作意向浮层(完整版) */
function $(id){return document.getElementById(id)}
let partnerType = 'edu';
function openPartner(type){
  partnerType = type;
  const isEdu = type === 'edu';
  $('partnerSheetTitle').textContent = isEdu ? '🎓 高校合作意向' : '🏛️ 政府治理合作';
  $('partnerSheetSub').textContent = isEdu
    ? '高校合作·产教融合·课程共建·实习就业一体化'
    : '政府对接·行业标准·政策研究·数字化治理';
  resetForm();
  $('partnerOverlay').classList.add('show');
  if(window.innerWidth<=480) setTimeout(()=>{ const e=$('pfName'); if(e) e.focus(); },300);
}
function closePartner(){ $('partnerOverlay').classList.remove('show') }
function resetForm(){
  ['pfName','pfOrg','pfRole','pfContact','pfNote'].forEach(id=>{ const e=$(id); if(e) e.value=''; });
  document.querySelectorAll('.partner-form-chip').forEach(c=>c.classList.remove('on'));
}
function submitPartner(){
  const name=$('pfName').value.trim(), org=$('pfOrg').value.trim(), contact=$('pfContact').value.trim();
  if(!name||!org||!contact){ alert('请填写姓名、机构/学校、联系方式'); return; }
  const chips=[...document.querySelectorAll('.partner-form-chip.on')].map(c=>c.dataset.v);
  const btn=$('pfSubmit'); btn.disabled=true; btn.textContent='提交中…';
  const data={t:'partner_intent',type:partnerType,name,org,role:$('pfRole').value.trim(),contact,chips,note:$('pfNote').value.trim(),ts:Date.now()};
  try{ if(navigator.sendBeacon) navigator.sendBeacon('/api/event', JSON.stringify(data)); }catch(e){}
  setTimeout(()=>{
      $('partnerSheetBody').innerHTML = '<div class="partner-form-success"><div class="ico">✅</div><div class="t">已收到,谢谢!</div><div class="s">小豆子会在 <b>24 小时内</b>通过您填写的联系方式主动联系您。<br>合作方向:'+(chips.length?chips.join('、'):'(未选)')+'<br><br><button class="partner-form-submit" id="pfDone" style="margin-top:14px">好</button></div></div>';
      const done=$('pfDone'); if(done) done.addEventListener('click',closePartner);
    }, 500);
}
// 直接绑定(partner.js 在 body 末尾,DOM 已就绪;不依赖 DOMContentLoaded 避免 async 时序问题)
(function bindPartner(){
  const ov=$('partnerOverlay');
  if(ov) ov.addEventListener('click',e=>{ if(e.target.id==='partnerOverlay') closePartner(); });
  const close=$('partnerSheetClose');
  if(close) close.addEventListener('click',closePartner);
  const submit=$('pfSubmit');
  if(submit) submit.addEventListener('click',submitPartner);
  document.querySelectorAll('[data-partner]').forEach(c=>c.addEventListener('click',e=>{ e.preventDefault(); openPartner(c.dataset.partner); }));
  document.querySelectorAll('.partner-form-chip').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('on')));
})();
