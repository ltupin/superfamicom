// Minimal CSV parser and renderer

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
  // push last
  if(field!=='' || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}

function uniq(arr){ return Array.from(new Set(arr)).filter(Boolean); }

async function loadAndRender(){
  const res = await fetch('listing.csv');
  const txt = await res.text();
  const rows = parseCSV(txt);
  if(rows.length===0) return;
  const headers = rows[0].map(h=>h.trim());
  const data = rows.slice(1).map(r=>{
    const obj={};
    for(let i=0;i<headers.length;i++){ obj[headers[i]||('col'+i)] = r[i]||'' }
    return obj;
  });
  window.gamesData = data;
  populateCategoryFilter(data, headers);
  renderTable(data);
  setupSearch();
}

function populateCategoryFilter(data, headers){
  const catName = 'Main Category';
  const sel = document.getElementById('category');
  if(!headers.includes(catName)) return;
  const cats = uniq(data.map(d=>d[catName] && d[catName].trim()));
  cats.sort((a,b)=> (a||'').localeCompare(b||''));
  cats.forEach(c=>{ if(!c) return; const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o)});
  sel.addEventListener('change',()=> applyFilters());
}

function setupSearch(){
  const search = document.getElementById('search');
  const clear = document.getElementById('clear');
  let t;
  search.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>applyFilters(),150)});
  clear.addEventListener('click',()=>{ search.value=''; document.getElementById('category').value=''; applyFilters(); });
}

function applyFilters(){
  const q = document.getElementById('search').value.toLowerCase().trim();
  const cat = document.getElementById('category').value;
  const filtered = window.gamesData.filter(g=>{
    if(cat && (g['Main Category']||'')!==cat) return false;
    if(!q) return true;
    const keys = ['Titre en anglais','Titre en Japonais','Editeurs','Main Category','Sub Category'];
    return keys.some(k=> (g[k]||'').toLowerCase().includes(q));
  });
  renderTable(filtered);
}

function renderTable(data){
  const tbody = document.querySelector('#games tbody');
  tbody.innerHTML='';
  const countEl = document.getElementById('count');
  countEl.textContent = `${data.length.toLocaleString()} jeux affichés`;
  const max = 1000; // safety cap to avoid browser freeze
  const list = data.slice(0, max);
  for(const g of list){
    const tr = document.createElement('tr');
    const cells = [
      g['Titre en anglais']||g['Title']||'',
      g['Titre en Japonais']||'',
      g['Editeurs']||'',
      g['Numéro de série']||g['Serial']||'',
      g['Date']||'',
      g['Main Category']||'',
      g['Sub Category']||''
    ];
    cells.forEach(c=>{ const td=document.createElement('td'); td.textContent=c; tr.appendChild(td); });
    tbody.appendChild(tr);
  }
  if(data.length>max){
    const info = document.createElement('div'); info.style.padding='8px'; info.style.color='#374151'; info.textContent = `Affichage limité à ${max} éléments pour la performance.`; document.querySelector('.table-wrap').appendChild(info);
  }
}

loadAndRender().catch(console.error);
