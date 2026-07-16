// Minimal CSV parser and client-side list rendering

function parseCSV(text){
  const rows = [];
  let i=0; const len=text.length;
  let row=[]; let field=''; let inQuotes=false;
  while(i<len){
    const c=text[i];
    if(inQuotes){
      if(c==='"'){
        if(text[i+1]==='"'){ field += '"'; i+=2; continue; }
        inQuotes=false; i++; continue;
      }
      field += c; i++; continue;
    }
    if(c==='"'){ inQuotes=true; i++; continue; }
    if(c===','){ row.push(field); field=''; i++; continue; }
    if(c==='\r'){ i++; continue; }
    if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=''; i++; continue; }
    field += c; i++;
  }
  if(field!=='' || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}

function uniq(arr){ return Array.from(new Set(arr)).filter(Boolean); }

let gamesData = [];
let filteredData = [];
let sortColumn = '';
let sortDirection = 1; // 1 = asc, -1 = desc

async function loadAndRender(){
  const candidates = ['../data/listing.csv','data/listing.csv'];
  let txt='';
  for(const p of candidates){
    try{
      const res = await fetch(p);
      if(!res.ok) continue;
      txt = await res.text();
      break;
    }catch(e){/*ignore*/}
  }
  if(!txt) throw new Error('listing.csv not found (tried: '+candidates.join(',')+')');
  const rows = parseCSV(txt);
  if(rows.length===0) return;
  const headers = rows[0].map(h=>h.trim());
  const data = rows.slice(1).map(r=>{
    const obj={};
    for(let i=0;i<headers.length;i++){ obj[headers[i]||('col'+i)] = r[i]||'' }
    return obj;
  });
  gamesData = data;
  filteredData = data;
  setupColumnControls(headers);
  populateCategoryFilter(data, headers);
  populatePublisherFilter(data, headers);
  setupSearch();
  renderList();
}

function populateCategoryFilter(data, headers){
  const catName = 'Main Category';
  const sel = document.getElementById('category');
  if(!headers.includes(catName)) return;
  const cats = uniq(data.map(d=>d[catName] && d[catName].trim()));
  cats.sort((a,b)=> (a||'').localeCompare(b||''));
  cats.forEach(c=>{ if(!c) return; const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o)});
  sel.addEventListener('change',()=>{ applyFilters(); });
}

function setupSearch(){
  const search = document.getElementById('search');
  const clear = document.getElementById('clear');
  let t;
  search.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>applyFilters(),150)});
  clear.addEventListener('click',()=>{
    search.value='';
    const catSel = document.getElementById('category');
    const pubSel = document.getElementById('publisher');
    Array.from(catSel.options).forEach(o=> o.selected = false);
    Array.from(pubSel.options).forEach(o=> o.selected = false);
    applyFilters();
  });
}

function getSelectedCategories(){
  const sel = document.getElementById('category');
  return Array.from(sel.selectedOptions).map(o=>o.value).filter(Boolean);
}

function getSelectedPublishers(){
  const sel = document.getElementById('publisher');
  return Array.from(sel.selectedOptions).map(o=>o.value).filter(Boolean);
}

function applyFilters(){
  const q = document.getElementById('search').value.toLowerCase().trim();
  const selectedCats = getSelectedCategories();
  const selectedPubs = getSelectedPublishers();
  filteredData = gamesData.filter(g=>{
    if(selectedCats.length){
      const cat = (g['Main Category']||'').trim();
      if(!selectedCats.includes(cat)) return false;
    }
    if(selectedPubs.length){
      const pubs = String(g['Editeurs']||'').split('/').map(p=>p.trim()).filter(Boolean);
      if(!selectedPubs.some(pub=> pubs.includes(pub))) return false;
    }
    if(!q) return true;
    const keys = ['Titre en anglais','Titre en Japonais','Editeurs','Main Category','Sub Category'];
    return keys.some(k=> (g[k]||'').toLowerCase().includes(q));
  });
  renderList();
}

function getSortKey(displayCol){
  if(displayCol==='Title') return ['Titre en anglais','Title'];
  if(displayCol==='Japanese title') return ['Titre en Japonais'];
  if(displayCol==='Publisher & Editor') return ['Editeurs'];
  if(displayCol==='Code JPN') return ['Code JPN'];
  if(displayCol==='Code USA') return ['Code USA'];
  if(displayCol==='Sortie JPN') return ['Sortie JPN'];
  if(displayCol==='Sortie USA') return ['Sortie USA'];
  if(displayCol==='Main Category') return ['Main Category'];
  if(displayCol==='Sub Category') return ['Sub Category'];
  return [displayCol];
}

function sortFilteredData(){
  if(!sortColumn) return filteredData;
  const keys = getSortKey(sortColumn);
  return [...filteredData].sort((a,b)=>{
    const va = keys.reduce((acc,key)=> acc || (a[key]||''), '');
    const vb = keys.reduce((acc,key)=> acc || (b[key]||''), '');
    return sortDirection * String(va).localeCompare(String(vb), undefined, {numeric:true, sensitivity:'base'});
  });
}

function toggleSort(col){
  if(sortColumn===col){
    sortDirection = -sortDirection;
  } else {
    sortColumn = col;
    sortDirection = 1;
  }
  renderList();
}

function renderList(){
  const sorted = sortFilteredData();
  renderTable(sorted);
}

function renderTable(data){
  const tbody = document.querySelector('#games tbody');
  const thead = document.querySelector('#games thead');
  tbody.innerHTML='';
  const selected = getSelectedColumns();
  thead.innerHTML = '<tr>' + selected.map(col => {
    const active = col===sortColumn ? ' active' : '';
    const arrow = col===sortColumn ? (sortDirection===1 ? '▲' : '▼') : '⇅';
    return `<th class="sortable${active}" data-col="${col}"><span class="header-label">${col}</span><span class="sort-indicator">${arrow}</span></th>`;
  }).join('') + '</tr>';
  document.querySelectorAll('#games thead th.sortable').forEach(th=>{
    th.addEventListener('click',()=> toggleSort(th.dataset.col));
  });
  const countEl = document.getElementById('count');
  countEl.textContent = `${filteredData.length.toLocaleString()} jeux`;
  for(const g of data){
    const tr = document.createElement('tr');
    // support both `uid` (old) and new `id` column; set both data attributes for compatibility
    const recId = g['id'] || g['uid'] || '';
    if(recId){ tr.dataset.id = recId; tr.dataset.uid = recId; }
    selected.forEach(col=>{
      const td=document.createElement('td');
      // map display column back to CSV keys
      let val = '';
      if(col==='Title') val = g['Titre en anglais']||g['Title']||'';
      else if(col==='Japanese title') val = g['Titre en Japonais']||'';
      else if(col==='Publisher & Editor') val = g['Editeurs']||'';
      else if(col==='Code JPN') val = g['Code JPN']||'';
      else if(col==='Code USA') val = g['Code USA']||'';
      else if(col==='Sortie JPN') val = g['Sortie JPN']||'';
      else if(col==='Sortie USA') val = g['Sortie USA']||'';
      else if(col==='Main Category') val = g['Main Category']||'';
      else if(col==='Sub Category') val = g['Sub Category']||'';
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

// Column controls
const DISPLAY_COLUMNS = ['Title','Japanese title','Publisher & Editor','Code JPN','Code USA','Sortie JPN','Sortie USA','Main Category','Sub Category'];

const DEFAULT_VISIBLE_COLUMNS = [
  'Title',
  'Japanese title',
  'Publisher & Editor',
  'Code JPN',
  'Main Category'
];

function populatePublisherFilter(data, headers){
  const sel = document.getElementById('publisher');
  if(!headers.includes('Editeurs')) return;
  const all = data.flatMap(d=> String(d['Editeurs']||'').split('/').map(entry=>entry.trim()).filter(Boolean));
  const unique = uniq(all);
  unique.sort((a,b)=> a.localeCompare(b, undefined, {sensitivity:'base'}));
  unique.forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
  sel.addEventListener('change',()=>{ applyFilters(); });
}

function setupColumnControls(headers){
  const container = document.getElementById('col-list');
  if(!container) return;
  container.innerHTML='';

  DISPLAY_COLUMNS.forEach(col=>{
    const id = 'col_' + col.replace(/\s+/g,'_');
    const label = document.createElement('label');
    label.style.display='inline-flex';
    label.style.alignItems='center';

    const inp = document.createElement('input');
    inp.type='checkbox';
    inp.id = id;
    inp.checked = DEFAULT_VISIBLE_COLUMNS.includes(col);

    inp.addEventListener('change',()=> renderList());

    const span = document.createElement('span');
    span.textContent = ' ' + col;

    label.appendChild(inp);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function getSelectedColumns(){
  const sel = [];
  DISPLAY_COLUMNS.forEach(col=>{
    const id = 'col_' + col.replace(/\s+/g,'_');
    const inp = document.getElementById(id);
    if(inp && inp.checked) sel.push(col);
  });
  return sel;
}

loadAndRender().catch(console.error);
