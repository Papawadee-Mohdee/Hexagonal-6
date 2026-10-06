// app.js

const REGION_MAP = {
    "เหนือ": ["เชียงราย", "เชียงใหม่", "น่าน", "พะเยา", "แพร่", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน", "อุตรดิตถ์"],
    "ตะวันออกเฉียงเหนือ": ["กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา", "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร", "ร้อยเอ็ด", "เลย", "สกลนคร", "สุรินทร์", "ศรีสะเกษ", "หนองคาย", "หนองบัวลำภู", "อุดรธานี", "อุบลราชธานี", "อำนาจเจริญ"],
    "กลาง": ["กรุงเทพมหานคร", "กำแพงเพชร", "ชัยนาท", "นครนายก", "นครปฐม", "นครสวรรค์", "นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา", "พิจิตร", "พิษณุโลก", "เพชรบูรณ์", "ลพบุรี", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "อ่างทอง", "อุทัยธานี"],
    "ตะวันออก": ["จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี", "ระยอง", "สระแก้ว"],
    "ตะวันตก": ["กาญจนบุรี", "ตาก", "ประจวบคีรีขันธ์", "เพชรบุรี", "ราชบุรี"],
    "ใต้": ["กระบี่", "ชุมพร", "ตรัง", "นครศรีธรรมราช", "นราธิวาส", "ปัตตานี", "พังงา", "พัทลุง", "ภูเก็ต", "ระนอง", "สงขลา", "สตูล", "สุราษฎร์ธานี", "ยะลา"]
};

// Flatten to provToRegion
const provToRegion = {};
const allProvincesList = [];
const allRegionsList = Object.keys(REGION_MAP);

for (const [region, provs] of Object.entries(REGION_MAP)) {
    for (const p of provs) {
        provToRegion[p] = region;
        allProvincesList.push(p);
    }
}
allProvincesList.sort();

let riceData = [];
let geojson = null;
let map, geojsonLayer, info, legend;
let donutChart = null;
let trendChart = null;

const thaiFormatter = new Intl.NumberFormat('th-TH');
const compactFormatter = new Intl.NumberFormat('en-US', { notation: "compact" });

// Global State
let state = {
    viewMode: 'province', // 'province' | 'region'
    years: new Set([2565, 2566, 2567, 2568]),
    selected: new Set(allProvincesList), // always store what is selected based on mode
    metric: 'planted_rai'
};

const missingDataProvinces = new Set(['ระนอง', 'จันทบุรี', 'พังงา', 'ภูเก็ต']);

const colors = {
    planted: '#22C55E',
    harvested: '#166534',
    production: '#F59E0B',
    pie: ['#166534', '#22C55E', '#0EA5E9', '#F59E0B', '#EF4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#cbd5e1']
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupListeners();
    loadData();
});

function initTheme() {
    const btn = document.getElementById('themeToggleBtn');
    let isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
    
    btn.addEventListener('click', () => {
        isDark = !isDark;
        if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        if(donutChart) {
            Chart.defaults.color = isDark ? '#9ca3af' : '#6b7280';
            donutChart.update();
            trendChart.update();
        }
    });
}

function setupListeners() {
    document.getElementById('viewProvBtn').addEventListener('click', () => setViewMode('province'));
    document.getElementById('viewRegBtn').addEventListener('click', () => setViewMode('region'));
    
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        state.years = new Set([2565, 2566, 2567, 2568]);
        state.selected = new Set(state.viewMode === 'province' ? allProvincesList : allRegionsList);
        document.querySelectorAll('.year-btn').forEach(b => b.classList.add('active'));
        document.getElementById('provSearch').value = '';
        renderFilterList();
        updateDashboard();
        resetMapBounds();
    });
    
    document.getElementById('metricSelect').addEventListener('change', (e) => {
        state.metric = e.target.value;
        updateDashboard();
    });
    
    document.getElementById('provSearch').addEventListener('input', (e) => {
        renderFilterList(e.target.value);
    });
}

function setViewMode(mode) {
    if (state.viewMode === mode) return; // do nothing if already in mode
    state.viewMode = mode;
    document.getElementById('viewProvBtn').classList.toggle('active', mode === 'province');
    document.getElementById('viewRegBtn').classList.toggle('active', mode === 'region');
    document.getElementById('locationFilterTitle').innerText = mode === 'province' ? 'จังหวัด' : 'ภูมิภาค';
    
    // Reset selection to ALL when switching mode to avoid empty states
    state.selected = new Set(mode === 'province' ? allProvincesList : allRegionsList);
    renderFilterList();
    updateDashboard();
    resetMapBounds();
}

async function loadData() {
    try {
        const csvRes = await fetch('rice_offseason_cleaned_v2.csv');
        const csvText = await csvRes.text();
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                // Ensure every row has a correct region from SSOT
                riceData = results.data.filter(d => d.name).map(d => {
                    const region = provToRegion[d.name];
                    if (!region) {
                        console.warn(`WARNING: Province "${d.name}" does not have a mapped region!`);
                    }
                    d.region = region;
                    return d;
                }).filter(d => d.region); // drop if no region
                
                state.selected = new Set(allProvincesList);
                
                // Verify totals
                let tPlanted = 0, tHarvested = 0, tProduction = 0;
                riceData.forEach(d => {
                    tPlanted += d.planted_rai || 0;
                    tHarvested += d.harvested_rai || 0;
                    tProduction += d.production_ton || 0;
                });
                console.log(`Totals Check - Planted: ${tPlanted}, Harvested: ${tHarvested}, Prod: ${tProduction}`);
                
                renderYearButtons();
                renderFilterList();
                initMap();
                
                fetch('thailand_provinces.geojson')
                    .then(r => r.json())
                    .then(geo => { geojson = geo; updateDashboard(); resetMapBounds(); })
                    .catch(e => { console.error(e); updateDashboard(); });
            }
        });
    } catch (e) { console.error(e); }
}

function renderYearButtons() {
    const container = document.getElementById('yearFilter');
    container.innerHTML = '';
    [2565, 2566, 2567, 2568].forEach(y => {
        const btn = document.createElement('button');
        btn.className = `year-btn ${state.years.has(y) ? 'active' : ''}`;
        btn.innerText = y;
        btn.onclick = () => {
            if (state.years.has(y) && state.years.size > 1) {
                state.years.delete(y);
                btn.classList.remove('active');
            } else {
                state.years.add(y);
                btn.classList.add('active');
            }
            updateDashboard();
        };
        container.appendChild(btn);
    });
}

function renderFilterList(searchQuery = '') {
    const container = document.getElementById('provinceList');
    container.innerHTML = '';
    
    if (state.viewMode === 'province') {
        const filteredProvs = allProvincesList.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const selectAll = document.getElementById('selectAllProv');
        selectAll.checked = filteredProvs.length > 0 && filteredProvs.every(i => state.selected.has(i));
        selectAll.onchange = (e) => {
            const chk = e.target.checked;
            filteredProvs.forEach(i => chk ? state.selected.add(i) : state.selected.delete(i));
            renderFilterList(searchQuery);
            updateDashboard();
        };

        // Group by Region
        allRegionsList.forEach(region => {
            const provsInReg = REGION_MAP[region].filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
            if (provsInReg.length === 0) return;
            
            const groupDiv = document.createElement('div');
            groupDiv.style.marginBottom = '12px';
            
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.alignItems = 'center';
            headerDiv.style.fontWeight = 'bold';
            headerDiv.style.marginBottom = '4px';
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = region;
            
            const selectRegBtn = document.createElement('button');
            selectRegBtn.innerText = 'เลือกทั้งภาค';
            selectRegBtn.style.fontSize = '11px';
            selectRegBtn.style.padding = '2px 4px';
            selectRegBtn.style.cursor = 'pointer';
            
            const allSelected = provsInReg.every(p => state.selected.has(p));
            selectRegBtn.innerText = allSelected ? 'ล้างทั้งภาค' : 'เลือกทั้งภาค';
            
            selectRegBtn.onclick = () => {
                const willSelect = !allSelected;
                provsInReg.forEach(p => willSelect ? state.selected.add(p) : state.selected.delete(p));
                renderFilterList(searchQuery);
                updateDashboard();
            };
            
            headerDiv.appendChild(titleSpan);
            headerDiv.appendChild(selectRegBtn);
            groupDiv.appendChild(headerDiv);
            
            provsInReg.forEach(item => {
                const lbl = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = state.selected.has(item);
                cb.onchange = (e) => {
                    if(e.target.checked) state.selected.add(item);
                    else state.selected.delete(item);
                    renderFilterList(searchQuery);
                    updateDashboard();
                };
                lbl.appendChild(cb);
                lbl.appendChild(document.createTextNode(item));
                groupDiv.appendChild(lbl);
            });
            container.appendChild(groupDiv);
        });
        
    } else {
        const filteredRegs = allRegionsList.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const selectAll = document.getElementById('selectAllProv');
        selectAll.checked = filteredRegs.length > 0 && filteredRegs.every(i => state.selected.has(i));
        selectAll.onchange = (e) => {
            const chk = e.target.checked;
            filteredRegs.forEach(i => chk ? state.selected.add(i) : state.selected.delete(i));
            renderFilterList(searchQuery);
            updateDashboard();
        };
        
        filteredRegs.forEach(item => {
            const lbl = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = state.selected.has(item);
            cb.onchange = (e) => {
                if(e.target.checked) state.selected.add(item);
                else state.selected.delete(item);
                renderFilterList(searchQuery);
                updateDashboard();
            };
            lbl.appendChild(cb);
            lbl.appendChild(document.createTextNode(item));
            container.appendChild(lbl);
        });
    }
}

function initMap() {
    map = L.map('map').setView([13.7, 100.5], 5);
    map.setMaxBounds([[5.0, 97.0], [21.0, 106.0]]);
    map.options.minZoom = 5;
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
        opacity: 0.5
    }).addTo(map);

    info = L.control();
    info.onAdd = function () {
        this._div = L.DomUtil.create('div', 'info-legend'); 
        this.update();
        return this._div;
    };
    info.update = function (props) {
        if (!props) {
            this._div.innerHTML = '<h4>รายละเอียด</h4>Hover บนพื้นที่';
            return;
        }
        
        let pName = props.ADM1_TH || props.adm1_name1; 
        const cleanName = getProvinceByPcode(props.adm1_pcode) || pName;
        
        if (missingDataProvinces.has(cleanName)) {
            this._div.innerHTML = `<h4>${cleanName}</h4><b>${provToRegion[cleanName] || ''}</b><br/><span style="color:red;">ไม่มีข้อมูลในชุดข้อมูลนี้</span>`;
            return;
        }
        
        const val = getMapValue(cleanName);
        const metricName = document.getElementById('metricSelect').options[document.getElementById('metricSelect').selectedIndex].text;
        
        this._div.innerHTML = `<h4>${cleanName}</h4><b>${provToRegion[cleanName] || ''}</b><br/>${metricName}: ${val > 0 ? thaiFormatter.format(val) : 'ไม่มีข้อมูล/ไม่ได้เลือก'}`;
    };
    info.addTo(map);
    
    legend = L.control({position: 'bottomright'});
    legend.onAdd = function () {
        this._div = L.DomUtil.create('div', 'info-legend');
        return this._div;
    };
    legend.addTo(map);
}

function resetMapBounds() {
    if (geojsonLayer) {
        map.fitBounds(geojsonLayer.getBounds());
    } else {
        map.setView([13.7, 100.5], 5);
    }
}

function getProvinceByPcode(pcode) {
    const row = riceData.find(d => d.pcode === pcode);
    return row ? row.name : null;
}

function getMapValue(provName) {
    if (!provName) return 0;
    let isActive = state.viewMode === 'province' ? state.selected.has(provName) : state.selected.has(provToRegion[provName]);
    if (!isActive) return 0;
    
    return riceData
        .filter(d => d.name === provName && state.years.has(d.year_be))
        .reduce((sum, d) => sum + (d[state.metric] || 0), 0);
}

function getColor(provName, d, maxVal) {
    if (missingDataProvinces.has(provName)) return '#d1d5db'; 
    if (!d || d === 0) return '#e5e7eb'; 
    const r = d / maxVal;
    return r > 0.8 ? '#14532d' :
           r > 0.6 ? '#166534' :
           r > 0.4 ? '#22c55e' :
           r > 0.2 ? '#4ade80' : '#86efac';
}

function getFilteredData() {
    return riceData.filter(d => {
        if (!state.years.has(d.year_be)) return false;
        if (state.viewMode === 'province') return state.selected.has(d.name);
        return state.selected.has(d.region);
    });
}

function toggleSelection(item) {
    // Save old state for rollback
    const oldState = new Set(state.selected);
    
    if (state.selected.has(item)) {
        state.selected.delete(item);
    } else {
        // If clicking a single item when all were selected, maybe we want to isolate it?
        // Let's just do standard toggle.
        state.selected.add(item);
    }
    
    if (state.selected.size === 0) {
        console.error(`Filter resulted in 0 items (removed ${item}). Rolling back.`);
        state.selected = oldState;
        return;
    }
    
    renderFilterList();
    updateDashboard();
    
    // Fit map bounds to selected items
    if (geojsonLayer && geojson) {
        // Find features that match selected
        const selectedFeatures = geojson.features.filter(f => {
            const pName = getProvinceByPcode(f.properties.adm1_pcode) || f.properties.ADM1_TH || f.properties.adm1_name1;
            if (state.viewMode === 'province') return state.selected.has(pName);
            return state.selected.has(provToRegion[pName]);
        });
        
        if (selectedFeatures.length > 0) {
            const group = new L.featureGroup(selectedFeatures.map(f => L.geoJson(f)));
            map.fitBounds(group.getBounds());
        }
    }
}

function updateDashboard() {
    const emptyOverlay = document.getElementById('emptyStateOverlay');
    if (state.selected.size === 0) {
        emptyOverlay.classList.add('active');
    } else {
        emptyOverlay.classList.remove('active');
    }

    const data = getFilteredData();
    updateChips();
    updateKPIs(data);
    updateMap();
    updateCharts(data);
}

function updateChips() {
    const c = document.getElementById('activeFilters');
    c.innerHTML = '';
    
    const yChip = document.createElement('div');
    yChip.className = 'chip';
    yChip.innerText = `ปี: ${Array.from(state.years).sort().join(', ')}`;
    c.appendChild(yChip);
    
    if (state.selected.size > 0 && state.selected.size < (state.viewMode==='province'?allProvincesList.length:allRegionsList.length)) {
        Array.from(state.selected).forEach(item => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            if (state.viewMode === 'region') {
                chip.innerText = `${item} (${REGION_MAP[item].length} จังหวัด)`;
            } else {
                chip.innerText = item;
            }
            const close = document.createElement('span');
            close.innerText = ' ×';
            close.style.cursor = 'pointer';
            close.onclick = () => toggleSelection(item);
            chip.appendChild(close);
            c.appendChild(chip);
        });
    } else {
        const vChip = document.createElement('div');
        vChip.className = 'chip';
        vChip.innerText = `${state.viewMode==='province'?'ทุกจังหวัด':'ทุกภูมิภาค'}`;
        c.appendChild(vChip);
    }
}

function updateKPIs(data) {
    const calc = (ySet) => {
        const d = riceData.filter(r => ySet.has(r.year_be) && 
            (state.viewMode === 'province' ? state.selected.has(r.name) : state.selected.has(r.region))
        );
        const p = d.reduce((s,r) => s+(r.planted_rai||0),0);
        const h = d.reduce((s,r) => s+(r.harvested_rai||0),0);
        const t = d.reduce((s,r) => s+(r.production_ton||0),0);
        const yp = p > 0 ? (t*1000)/p : 0;
        const yh = h > 0 ? (t*1000)/h : 0;
        return {p, h, t, yp, yh};
    };
    
    const current = calc(state.years);
    const minYear = Math.min(...Array.from(state.years));
    const prev = calc(new Set([minYear - 1]));
    
    const isMultiYear = state.years.size > 1;
    
    const render = (id, val, pVal, unit) => {
        document.getElementById(id).innerText = thaiFormatter.format(Math.round(val));
        const trendEl = document.getElementById(id.replace('kpi', 'trend'));
        
        if (isMultiYear || pVal === 0) {
            trendEl.innerText = `(หน่วย: ${unit})`;
            trendEl.className = 'kpi-trend trend-flat';
        } else {
            const pct = ((val - pVal) / pVal) * 100;
            const sign = pct > 0 ? '▲' : (pct < 0 ? '▼' : '-');
            trendEl.innerText = `${sign} ${Math.abs(pct).toFixed(1)}% (เทียบปี ${minYear-1})`;
            trendEl.className = `kpi-trend ${pct > 0 ? 'trend-up' : (pct < 0 ? 'trend-down' : 'trend-flat')}`;
        }
    };
    
    render('kpiPlanted', current.p, prev.p, 'ไร่');
    render('kpiHarvested', current.h, prev.h, 'ไร่');
    render('kpiProduction', current.t, prev.t, 'ตัน');
    render('kpiYieldP', current.yp, prev.yp, 'กก./ไร่');
    render('kpiYieldH', current.yh, prev.yh, 'กก./ไร่');
}

function updateMap() {
    if (!geojson) return;
    if (geojsonLayer) map.removeLayer(geojsonLayer);
    
    let maxVal = 0;
    allProvincesList.forEach(p => {
        const v = getMapValue(p);
        if(v > maxVal) maxVal = v;
    });
    
    geojsonLayer = L.geoJson(geojson, {
        style: (feature) => {
            const pName = getProvinceByPcode(feature.properties.adm1_pcode);
            return {
                fillColor: getColor(pName, getMapValue(pName), maxVal),
                weight: 1,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.8
            };
        },
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ weight: 2, color: '#333', dashArray: '', fillOpacity: 1 });
                    l.bringToFront();
                    info.update(feature.properties);
                },
                mouseout: (e) => {
                    geojsonLayer.resetStyle(e.target);
                    info.update();
                },
                click: (e) => {
                    const pName = getProvinceByPcode(feature.properties.adm1_pcode);
                    if(!pName || missingDataProvinces.has(pName)) return;
                    
                    const item = state.viewMode === 'region' ? provToRegion[pName] : pName;
                    toggleSelection(item);
                }
            });
        }
    }).addTo(map);
    
    const grades = [0, maxVal*0.2, maxVal*0.4, maxVal*0.6, maxVal*0.8];
    let labels = [];
    for (let i = 0; i < grades.length; i++) {
        if (grades[i] === 0 && maxVal === 0) continue;
        labels.push(
            '<i style="background:' + getColor('Valid', grades[i] + 1, maxVal) + '"></i> ' +
            compactFormatter.format(grades[i]) + (grades[i + 1] ? '&ndash;' + compactFormatter.format(grades[i + 1]) + '<br>' : '+')
        );
    }
    legend._div.innerHTML = labels.length ? labels.join('') : 'ไม่มีข้อมูล';
}

function updateCharts(data) {
    Chart.defaults.font.family = "'Noto Sans Thai', sans-serif";
    const groupKey = state.viewMode === 'province' ? 'name' : 'region';
    
    let metric = document.getElementById('metricSelect').value;
    if (metric.includes('yield')) {
        metric = 'production_ton'; 
    }
    
    const totals = {};
    data.forEach(d => { totals[d[groupKey]] = (totals[d[groupKey]] || 0) + (d[metric] || 0); });
    
    const sorted = Object.keys(totals).map(k => ({k, v: totals[k]})).sort((a,b) => b.v - a.v);
    
    let dLabels = [], dData = [];
    if (sorted.length > 8) { 
        dLabels = sorted.slice(0, 8).map(s => s.k);
        dData = sorted.slice(0, 8).map(s => s.v);
        dLabels.push('อื่นๆ');
        dData.push(sorted.slice(8).reduce((sum,s) => sum + s.v, 0));
    } else {
        dLabels = sorted.map(s => s.k);
        dData = sorted.map(s => s.v);
    }
    
    const metricText = metric === 'production_ton' ? 'ผลผลิต' : (metric === 'harvested_rai' ? 'เนื้อที่เก็บเกี่ยว' : 'เนื้อที่เพาะปลูก');
    document.getElementById('donutTitle').innerText = `สัดส่วน ${metricText} ${state.viewMode==='province'?'(Top 8)':''}`;
    
    if (donutChart) {
        donutChart.data.labels = dLabels;
        donutChart.data.datasets[0].data = dData;
        donutChart.update();
    } else {
        const ctx = document.getElementById('donutChart').getContext('2d');
        donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: dLabels,
                datasets: [{ data: dData, backgroundColor: colors.pie }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'right', labels: { boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const v = context.raw;
                                const p = ((v / total) * 100).toFixed(1);
                                return `${context.label}: ${thaiFormatter.format(v)} (${p}%)`;
                            }
                        }
                    }
                },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const clicked = dLabels[elements[0].index];
                        if (clicked === 'อื่นๆ') return;
                        
                        // Toggle logic (do not switch mode!)
                        toggleSelection(clicked);
                    }
                }
            }
        });
    }
    
    // Trend Chart
    const years = Array.from(state.years).sort();
    const yP = years.map(y => data.filter(d => d.year_be === y).reduce((s,d)=>s+(d.planted_rai||0),0));
    const yH = years.map(y => data.filter(d => d.year_be === y).reduce((s,d)=>s+(d.harvested_rai||0),0));
    const yT = years.map(y => data.filter(d => d.year_be === y).reduce((s,d)=>s+(d.production_ton||0),0));
    
    if (trendChart) {
        trendChart.data.labels = years.map(String);
        trendChart.data.datasets[0].data = yP;
        trendChart.data.datasets[1].data = yH;
        trendChart.data.datasets[2].data = yT;
        trendChart.update();
    } else {
        const ctx = document.getElementById('trendChart').getContext('2d');
        trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years.map(String),
                datasets: [
                    { label: 'เนื้อที่เพาะปลูก (ไร่)', data: yP, backgroundColor: colors.planted, yAxisID: 'y' },
                    { label: 'เนื้อที่เก็บเกี่ยว (ไร่)', data: yH, backgroundColor: colors.harvested, yAxisID: 'y' },
                    { label: 'ผลผลิต (ตัน)', data: yT, type: 'line', borderColor: colors.production, backgroundColor: colors.production, borderWidth: 3, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'ไร่' } },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'ตัน' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }
}
