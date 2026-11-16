// Your WhatsApp business number, with country code and without + or spaces.
const BUSINESS_WHATSAPP = '917992081882';
// On a server deployment, load the shared catalogue from the API. Static hosts
// (such as GitHub Pages) use the checked-in product snapshot instead.
function load(key, fallback){try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch{return fallback}}
let products=[];
async function refreshProducts(){
 try {
  let response;
  try { response=await fetch('/api/products',{cache:'no-store'}); } catch { response=null; }
  const isStaticHost=!response||response.status===404||response.status===405||
    (response.ok && !(response.headers.get('content-type')||'').includes('application/json'));
  if(isStaticHost) response=await fetch('./products.json',{cache:'no-store'});
  if(!response.ok) throw new Error('Catalogue request failed');
  const data=await response.json();
  if(!Array.isArray(data)) throw new Error('Invalid catalogue data');
  products=data; selected=selected.filter(id=>products.some(p=>p.id===id)); render();
 } catch { $('#empty').hidden=false; $('#empty').textContent='The catalogue could not be loaded. Please try again later.'; }
}

let selected=load('maison-enquiry',[]);
if(!Array.isArray(selected)) selected=[];
let category='All', lastFocus=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const grid=$('#product-grid'), overlay=$('#overlay'), drawer=$('#drawer');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const query=$('#search').value.trim().toLowerCase();
 const filtered=products.filter(p=>(category==='All'||p.category===category)&&`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query));
 const card = p => `<article class="product-card"><div class="product-image"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">${p.badge?`<span class="badge">${esc(p.badge)}</span>`:''}</div><div class="product-info"><div class="product-category">${esc(p.category)}</div><h3>${esc(p.name)}</h3><p class="product-description">${esc(p.description)}</p><div class="product-bottom"><span class="price">${esc(p.price)}</span><button class="add-btn ${selected.includes(p.id)?'added':''}" data-add="${esc(p.id)}" aria-pressed="${selected.includes(p.id)}">${selected.includes(p.id)?'✓ Added to list':'+ Add to enquiry'}</button></div></div></article>`;
 if (document.body.classList.contains('collection-page')) {
  const categories = category === 'All' ? ['Decor','Living','Dining','Lighting'] : [category];
  grid.innerHTML=categories.map(cat=>{const group=filtered.filter(p=>p.category===cat);return group.length?`<section class="category-group" aria-label="${esc(cat)}"><div class="category-heading"><div><span>EXPLORE BY CATEGORY</span><h3>${esc(cat)}<em>.</em></h3></div><span>${String(group.length).padStart(2,'0')} ${group.length===1?'PIECE':'PIECES'}</span></div><div class="product-grid">${group.map(card).join('')}</div></section>`:''}).join('');
 } else { grid.innerHTML=filtered.slice(0,8).map(card).join(''); }
 $('#empty').hidden=filtered.length>0;$('.count').textContent=selected.length;$('#all-count').textContent=String(products.length).padStart(2,'0');
 $('#drawer-items').innerHTML=selected.length?selected.map(id=>{const p=products.find(x=>x.id===id);return `<div class="drawer-item"><img src="${esc(p.image)}" alt=""><div><span class="product-category">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.price)}</p></div><button class="remove" data-remove="${esc(id)}">Remove</button></div>`}).join(''):'<div class="drawer-empty">Your list is waiting for a little inspiration.<br>Explore the collection and add your favourites.</div>';
 $('#send-list').disabled=!selected.length;$('#send-list').style.opacity=selected.length?'1':'.5';
}
function persistSelected(){try{localStorage.setItem('maison-enquiry',JSON.stringify(selected))}catch{showToast('Could not save the enquiry list in this browser')}render()}
function showToast(message){const t=$('.toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2400)}
function showPanel(panel){lastFocus=document.activeElement;overlay.hidden=false;[drawer].forEach(p=>{p.classList.remove('open');p.setAttribute('aria-hidden','true')});panel.classList.add('open');panel.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>panel.querySelector('button, input')?.focus(),50)}
function closePanels(){overlay.hidden=true;[drawer].forEach(p=>{p.classList.remove('open');p.setAttribute('aria-hidden','true')});document.body.style.overflow='';lastFocus?.focus()}
function whatsapp(message){window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')}
function general(){whatsapp("Hello! I found your catalogue and I'd love to know more about your products.")}
$('.filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));render()});
$('#search').addEventListener('input',render);$('#clear-filters').addEventListener('click',()=>{category='All';$('#search').value='';$$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.category==='All'));render()});
grid.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const id=b.dataset.add;if(selected.includes(id)){selected=selected.filter(x=>x!==id);showToast('Removed from your enquiry list')}else{selected.push(id);showToast('Added to your enquiry list')}persistSelected()});
$('#drawer-items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){selected=selected.filter(id=>id!==b.dataset.remove);persistSelected()}});
$$('[data-open-drawer]').forEach(b=>b.addEventListener('click',()=>showPanel(drawer)));$$('[data-general-enquiry]').forEach(b=>b.addEventListener('click',general));$$('[data-close]').forEach(b=>b.addEventListener('click',closePanels));overlay.addEventListener('click',closePanels);
$('#send-list').addEventListener('click',()=>{if(!selected.length)return;const lines=selected.map((id,i)=>{const p=products.find(p=>p.id===id);return `${i+1}. ${p.name} (${p.price})`});const note=$('#note').value.trim();whatsapp(`Hello! I'd like to enquire about these products from your catalogue:\n\n${lines.join('\n')}${note?'\n\nMy question: '+note:''}\n\nPlease share the availability and details. Thank you!`)});
$('.search-trigger').addEventListener('click',()=>{$('#collection').scrollIntoView();setTimeout(()=>$('#search').focus(),350)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)closePanels();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#collection').scrollIntoView();$('#search').focus()}});
const nav=$('.main-nav'), navToggle=$('.menu-toggle'), navBackdrop=$('.nav-backdrop'), navClose=$('.mobile-nav-close');
let previousMenuFocus=null;
function openMenu(){previousMenuFocus=document.activeElement;navBackdrop.hidden=false;nav.classList.add('open');navToggle.setAttribute('aria-expanded','true');navToggle.setAttribute('aria-label','Close menu');document.body.classList.add('menu-open');navClose.focus()}
function closeMenu(restore=true){if(!nav.classList.contains('open'))return;nav.classList.remove('open');navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-label','Open menu');navBackdrop.hidden=true;document.body.classList.remove('menu-open');if(restore&&previousMenuFocus)previousMenuFocus.focus()}
navToggle.addEventListener('click',()=>nav.classList.contains('open')?closeMenu():openMenu());
navClose.addEventListener('click',()=>closeMenu());navBackdrop.addEventListener('click',()=>closeMenu());
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu(false)));
document.addEventListener('keydown',e=>{if(!nav.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();closeMenu();return}if(e.key==='Tab'){const focusable=[...nav.querySelectorAll('button,a')].filter(el=>el.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
window.addEventListener('resize',()=>{if(window.innerWidth>640)closeMenu(false)});
render();
refreshProducts();
