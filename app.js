// app.js

const REGION_MAP = {
    "เหนือ": ["เชียงราย", "เชียงใหม่", "น่าน", "พะเยา", "แพร่", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน", "อุตรดิตถ์"],
    "ตะวันออกเฉียงเหนือ": ["กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา", "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร", "ร้อยเอ็ด", "เลย", "สกลนคร", "สุรินทร์", "ศรีสะเกษ", "หนองคาย", "หนองบัวลำภู", "อุดรธานี", "อุบลราชธานี", "อำนาจเจริญ"],
    "กลาง": ["กรุงเทพมหานคร", "กำแพงเพชร", "ชัยนาท", "นครนายก", "นครปฐม", "นครสวรรค์", "นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา", "พิจิตร", "พิษณุโลก", "เพชรบูรณ์", "ลพบุรี", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "อ่างทอง", "อุทัยธานี"],
    "ตะวันออก": ["จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี", "ระยอง", "สระแก้ว"],
    "ตะวันตก": ["กาญจนบุรี", "ตาก", "ประจวบคีรีขันธ์", "เพชรบุรี", "ราชบุรี"],
    "ใต้": ["กระบี่", "ชุมพร", "ตรัง", "นครศรีธรรมราช", "นราธิวาส", "ปัตตานี", "พังงา", "พัทลุง", "ภูเก็ต", "ระนอง", "สงขลา", "สตูล", "สุราษฎร์ธานี", "ยะลา"]
};

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

const regionColors = {
    "เหนือ": "#3b82f6",
    "ตะวันออกเฉียงเหนือ": "#22c55e",
    "กลาง": "#f59e0b",
    "ตะวันออก": "#ec4899",
    "ตะวันตก": "#8b5cf6",
    "ใต้": "#06b6d4"
};

let riceData = [];
let geojson = null;
let map, geojsonLayer, info, legend;
let donutChart = null, barChart = null, trendChart = null;
let activeHoverItem = null;

const thaiFormatter = new Intl.NumberFormat('th-TH');
const compactFormatter = new Intl.NumberFormat('en-US', { notation: "compact" });

// 1) สถาปัตยกรรม: state เดียว
let state = {
    viewMode: 'region', // 'province' | 'region'
    years: new Set([2565, 2566, 2567, 2568]),
    selectedRegions: new Set(allRegionsList),
    selectedProvinces: new Set(allProvincesList),
    metric: 'planted_rai'
};

const missingDataProvinces = new Set(['ระนอง', 'จันทบุรี', 'พังงา', 'ภูเก็ต']);

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
        
        if (donutChart) {
            Chart.defaults.color = isDark ? '#9ca3af' : '#6b7280';
            donutChart.update();
            barChart.update();
            trendChart.update();
        }
    });
}

function setupListeners() {
    document.getElementById('viewProvBtn').addEventListener('click', () => {
        state.viewMode = 'province';
        state.selectedProvinces = new Set(allProvincesList);
        state.selectedRegions = new Set(allRegionsList);
        render();
    });
    document.getElementById('viewRegBtn').addEventListener('click', () => {
        state.viewMode = 'region';
        state.selectedRegions = new Set(allRegionsList);
        state.selectedProvinces = new Set(allProvincesList);
        render();
    });
    
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        state.years = new Set([2565, 2566, 2567, 2568]);
        state.selectedRegions = new Set(allRegionsList);
        state.selectedProvinces = new Set(allProvincesList);
        render();
    });
    
    document.getElementById('metricSelect').addEventListener('change', (e) => {
        state.metric = e.target.value;
        render();
    });
    
    document.getElementById('provSearch').addEventListener('input', (e) => {
        renderFilterList(e.target.value);
    });

    document.getElementById('breadcrumb').addEventListener('click', () => {
        // Reset to all regions if clicked
        if (state.viewMode === 'region' && state.selectedRegions.size < allRegionsList.length) {
            state.selectedRegions = new Set(allRegionsList);
            state.selectedProvinces = new Set(allProvincesList);
            render();
        }
    });
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
                riceData = results.data.filter(d => d.name).map(d => {
                    const region = provToRegion[d.name];
                    d.region = region;
                    return d;
                }).filter(d => d.region); 
                
                renderYearButtons();
                initMap();
                
                fetch('thailand_provinces.geojson')
                    .then(r => r.json())
                    .then(geo => { geojson = geo; render(); })
                    .catch(e => { console.error(e); render(); });
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
        btn.onclick = (e) => {
            if (e.ctrlKey || e.shiftKey) {
                if (state.years.has(y)) state.years.delete(y);
                else state.years.add(y);
            } else {
                if (state.years.has(y) && state.years.size === 1) {
                    // Reset to all if clicking the only selected year
                    state.years = new Set([2565, 2566, 2567, 2568]);
                } else {
                    state.years = new Set([y]);
                }
            }
            if (state.years.size === 0) state.years = new Set([2565, 2566, 2567, 2568]);
            render();
        };
        container.appendChild(btn);
    });
}

function toggleLocationSelection(item, isMultiSelect) {
    if (state.viewMode === 'province') {
        if (isMultiSelect) {
            if (state.selectedProvinces.has(item)) state.selectedProvinces.delete(item);
            else state.selectedProvinces.add(item);
        } else {
            if (state.selectedProvinces.has(item) && state.selectedProvinces.size === 1) {
                state.selectedProvinces = new Set(allProvincesList);
            } else {
                state.selectedProvinces = new Set([item]);
            }
        }
    } else {
        if (isMultiSelect) {
            if (state.selectedRegions.has(item)) state.selectedRegions.delete(item);
            else state.selectedRegions.add(item);
        } else {
            if (state.selectedRegions.has(item) && state.selectedRegions.size === 1) {
                state.selectedRegions = new Set(allRegionsList);
            } else {
                state.selectedRegions = new Set([item]);
            }
        }
    }
    syncRegionsAndProvinces();
    render();
}

// Sync function to ensure regions and provinces match
function syncRegionsAndProvinces() {
    if (state.viewMode === 'region') {
        state.selectedProvinces.clear();
        state.selectedRegions.forEach(r => {
            REGION_MAP[r].forEach(p => state.selectedProvinces.add(p));
        });
    } else {
        state.selectedRegions.clear();
        allRegionsList.forEach(r => {
            const allInRegion = REGION_MAP[r].every(p => state.selectedProvinces.has(p));
            const someInRegion = REGION_MAP[r].some(p => state.selectedProvinces.has(p));
            // In province mode, we just care if ANY province is selected to highlight the region maybe?
            // Let's strictly mark regions where AT LEAST ONE province is selected
            if (someInRegion) state.selectedRegions.add(r);
        });
    }
}

// SINGLE render pipeline
function render() {
    if (state.selectedProvinces.size === 0 || state.selectedRegions.size === 0) {
        state.selectedRegions = new Set(allRegionsList);
        state.selectedProvinces = new Set(allProvincesList);
        console.error('Filter resulted in empty set. Reverted.');
    }

    // Toggle button active states
    document.getElementById('viewProvBtn').classList.toggle('active', state.viewMode === 'province');
    document.getElementById('viewRegBtn').classList.toggle('active', state.viewMode === 'region');
    document.getElementById('locationFilterTitle').innerText = state.viewMode === 'province' ? 'จังหวัด' : 'ภูมิภาค';

    renderYearButtons();
    const searchQuery = document.getElementById('provSearch').value;
    renderFilterList(searchQuery);

    const data = getFilteredData();
    updateBreadcrumbAndChips();
    updateKPIs(data);
    updateMap();
    updateCharts(data);
}

function getFilteredData() {
    return riceData.filter(d => state.years.has(d.year_be) && state.selectedProvinces.has(d.name));
}

function updateBreadcrumbAndChips() {
    const breadcrumb = document.getElementById('breadcrumb');
    if (state.viewMode === 'region') {
        if (state.selectedRegions.size === 1) {
            breadcrumb.innerHTML = `ทั้งประเทศ &rsaquo; ${Array.from(state.selectedRegions)[0]}`;
        } else if (state.selectedRegions.size === allRegionsList.length) {
            breadcrumb.innerHTML = `ทั้งประเทศ`;
        } else {
            breadcrumb.innerHTML = `ทั้งประเทศ &rsaquo; (เลือก ${state.selectedRegions.size} ภูมิภาค)`;
        }
    } else {
        if (state.selectedProvinces.size === allProvincesList.length) {
            breadcrumb.innerHTML = `ทั้งประเทศ (ทุกจังหวัด)`;
        } else {
            breadcrumb.innerHTML = `ทั้งประเทศ &rsaquo; เลือก ${state.selectedProvinces.size} จังหวัด`;
        }
    }

    const c = document.getElementById('activeFilters');
    c.innerHTML = '';
    
    // Years chip
    if (state.years.size < 4) {
        const yChip = document.createElement('div');
        yChip.className = 'chip';
        yChip.innerText = `ปี: ${Array.from(state.years).sort().join(', ')}`;
        c.appendChild(yChip);
    }
    
    // Region/Province chips
    if (state.viewMode === 'region') {
        if (state.selectedRegions.size < allRegionsList.length) {
            state.selectedRegions.forEach(r => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.innerText = `${r}`;
                const close = document.createElement('span');
                close.innerText = ' ×';
                close.style.cursor = 'pointer';
                close.onclick = () => toggleLocationSelection(r, true);
                chip.appendChild(close);
                c.appendChild(chip);
            });
        }
    } else {
        if (state.selectedProvinces.size < allProvincesList.length) {
            state.selectedProvinces.forEach(p => {
                if (state.selectedProvinces.size > 10) return; // limit chips
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.innerText = p;
                const close = document.createElement('span');
                close.innerText = ' ×';
                close.style.cursor = 'pointer';
                close.onclick = () => toggleLocationSelection(p, true);
                chip.appendChild(close);
                c.appendChild(chip);
            });
            if (state.selectedProvinces.size > 10) {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.innerText = `...และอีก ${state.selectedProvinces.size - 10} จังหวัด`;
                c.appendChild(chip);
            }
        }
    }
}

function renderFilterList(searchQuery = '') {
    const container = document.getElementById('provinceList');
    container.innerHTML = '';
    
    if (state.viewMode === 'province') {
        const filteredProvs = allProvincesList.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const selectAll = document.getElementById('selectAllProv');
        selectAll.checked = filteredProvs.length > 0 && filteredProvs.every(i => state.selectedProvinces.has(i));
        selectAll.onchange = (e) => {
            const chk = e.target.checked;
            filteredProvs.forEach(i => chk ? state.selectedProvinces.add(i) : state.selectedProvinces.delete(i));
            syncRegionsAndProvinces();
            render();
        };

        allRegionsList.forEach(region => {
            const provsInReg = REGION_MAP[region].filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
            if (provsInReg.length === 0) return;
            
            const groupDiv = document.createElement('div');
            groupDiv.style.marginBottom = '12px';
            
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.fontWeight = 'bold';
            headerDiv.style.marginBottom = '4px';
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = region;
            
            const selectRegBtn = document.createElement('button');
            selectRegBtn.style.fontSize = '11px';
            const allSelected = provsInReg.every(p => state.selectedProvinces.has(p));
            selectRegBtn.innerText = allSelected ? 'ล้างทั้งภาค' : 'เลือกทั้งภาค';
            selectRegBtn.onclick = () => {
                const willSelect = !allSelected;
                provsInReg.forEach(p => willSelect ? state.selectedProvinces.add(p) : state.selectedProvinces.delete(p));
                syncRegionsAndProvinces();
                render();
            };
            
            headerDiv.appendChild(titleSpan);
            headerDiv.appendChild(selectRegBtn);
            groupDiv.appendChild(headerDiv);
            
            provsInReg.forEach(item => {
                const lbl = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = state.selectedProvinces.has(item);
                cb.onchange = (e) => {
                    if(e.target.checked) state.selectedProvinces.add(item);
                    else state.selectedProvinces.delete(item);
                    syncRegionsAndProvinces();
                    render();
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
        selectAll.checked = filteredRegs.length > 0 && filteredRegs.every(i => state.selectedRegions.has(i));
        selectAll.onchange = (e) => {
            const chk = e.target.checked;
            filteredRegs.forEach(i => chk ? state.selectedRegions.add(i) : state.selectedRegions.delete(i));
            syncRegionsAndProvinces();
            render();
        };
        
        filteredRegs.forEach(item => {
            const lbl = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = state.selectedRegions.has(item);
            cb.onchange = (e) => {
                if(e.target.checked) state.selectedRegions.add(item);
                else state.selectedRegions.delete(item);
                syncRegionsAndProvinces();
                render();
            };
            lbl.appendChild(cb);
            lbl.appendChild(document.createTextNode(item));
            container.appendChild(lbl);
        });
    }
}

function updateKPIs(data) {
    const p = data.reduce((s,r) => s+(r.planted_rai||0),0);
    const h = data.reduce((s,r) => s+(r.harvested_rai||0),0);
    const t = data.reduce((s,r) => s+(r.production_ton||0),0);
    const yp = p > 0 ? (t*1000)/p : 0;
    const yh = h > 0 ? (t*1000)/h : 0;
    
    // Previous year calculation
    const minYear = Math.min(...Array.from(state.years));
    const prevData = riceData.filter(d => d.year_be === minYear - 1 && state.selectedProvinces.has(d.name));
    const pValP = prevData.reduce((s,r) => s+(r.planted_rai||0),0);
    const pValH = prevData.reduce((s,r) => s+(r.harvested_rai||0),0);
    const pValT = prevData.reduce((s,r) => s+(r.production_ton||0),0);
    const pValYp = pValP > 0 ? (pValT*1000)/pValP : 0;
    const pValYh = pValH > 0 ? (pValT*1000)/pValH : 0;
    
    const doRender = (id, val, pVal, unit) => {
        document.getElementById(id).innerText = thaiFormatter.format(Math.round(val));
        const trendEl = document.getElementById(id.replace('kpi', 'trend'));
        
        if (state.years.size > 1 || pVal === 0) {
            trendEl.innerText = `(หน่วย: ${unit})`;
            trendEl.className = 'kpi-trend trend-flat';
        } else {
            const pct = ((val - pVal) / pVal) * 100;
            const sign = pct > 0 ? '▲' : (pct < 0 ? '▼' : '-');
            trendEl.innerText = `${sign} ${Math.abs(pct).toFixed(1)}% (เทียบปี ${minYear-1})`;
            trendEl.className = `kpi-trend ${pct > 0 ? 'trend-up' : (pct < 0 ? 'trend-down' : 'trend-flat')}`;
        }
    };
    
    doRender('kpiPlanted', p, pValP, 'ไร่');
    doRender('kpiHarvested', h, pValH, 'ไร่');
    doRender('kpiProduction', t, pValT, 'ตัน');
    doRender('kpiYieldP', yp, pValYp, 'กก./ไร่');
    doRender('kpiYieldH', yh, pValYh, 'กก./ไร่');
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
        let pName = getProvinceByPcode(props.adm1_pcode) || props.ADM1_TH || props.adm1_name1; 
        
        if (missingDataProvinces.has(pName)) {
            this._div.innerHTML = `<h4>${pName}</h4><b>${provToRegion[pName] || ''}</b><br/><span style="color:red;">ไม่มีข้อมูลในชุดข้อมูลนี้</span>`;
            return;
        }
        
        const isActive = state.selectedProvinces.has(pName);
        const metricName = document.getElementById('metricSelect').options[document.getElementById('metricSelect').selectedIndex].text;
        
        const val = riceData.filter(d => d.name === pName && state.years.has(d.year_be)).reduce((s,d) => s+(d[state.metric]||0),0);
        
        this._div.innerHTML = `<h4>${pName}</h4><b>${provToRegion[pName] || ''}</b><br/>${metricName}: ${isActive && val > 0 ? thaiFormatter.format(val) : 'ไม่ได้เลือก/ไม่มีข้อมูล'}`;
    };
    info.addTo(map);
    
    legend = L.control({position: 'bottomright'});
    legend.onAdd = function () {
        this._div = L.DomUtil.create('div', 'info-legend');
        return this._div;
    };
    legend.addTo(map);
}

function updateMap() {
    if (!geojson) return;
    
    let maxVal = 0;
    allProvincesList.forEach(p => {
        if (!state.selectedProvinces.has(p)) return;
        const v = riceData.filter(d => d.name === p && state.years.has(d.year_be)).reduce((s,d) => s+(d[state.metric]||0),0);
        if(v > maxVal) maxVal = v;
    });

    const getStyle = (feature) => {
        const pName = getProvinceByPcode(feature.properties.adm1_pcode);
        let color = '#e5e7eb'; // default grey
        
        if (missingDataProvinces.has(pName)) color = '#d1d5db';
        else if (state.selectedProvinces.has(pName)) {
            const val = riceData.filter(d => d.name === pName && state.years.has(d.year_be)).reduce((s,d) => s+(d[state.metric]||0),0);
            if (val > 0) {
                const r = val / maxVal;
                color = r > 0.8 ? '#14532d' : r > 0.6 ? '#166534' : r > 0.4 ? '#22c55e' : r > 0.2 ? '#4ade80' : '#86efac';
            }
        }
        
        const isHovered = activeHoverItem === pName || activeHoverItem === provToRegion[pName];
        
        return {
            fillColor: color,
            weight: isHovered ? 2 : 1,
            opacity: 1,
            color: isHovered ? '#333' : 'white',
            dashArray: isHovered ? '' : '3',
            fillOpacity: isHovered ? 1 : 0.8
        };
    };
    
    if (geojsonLayer) {
        geojsonLayer.eachLayer(layer => layer.setStyle(getStyle(layer.feature)));
    } else {
        geojsonLayer = L.geoJson(geojson, {
            style: getStyle,
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => {
                        const pName = getProvinceByPcode(feature.properties.adm1_pcode);
                        activeHoverItem = state.viewMode === 'region' ? provToRegion[pName] : pName;
                        info.update(feature.properties);
                        renderMapStylesOnly();
                        highlightCharts(activeHoverItem);
                    },
                    mouseout: (e) => {
                        activeHoverItem = null;
                        info.update();
                        renderMapStylesOnly();
                        highlightCharts(null);
                    },
                    click: (e) => {
                        const pName = getProvinceByPcode(feature.properties.adm1_pcode);
                        if(!pName || missingDataProvinces.has(pName)) return;
                        const item = state.viewMode === 'region' ? provToRegion[pName] : pName;
                        toggleLocationSelection(item, e.originalEvent.ctrlKey || e.originalEvent.shiftKey);
                    }
                });
            }
        }).addTo(map);
    }
    
    // Fit Bounds
    const selectedFeatures = geojson.features.filter(f => {
        const pName = getProvinceByPcode(f.properties.adm1_pcode);
        return pName && state.selectedProvinces.has(pName);
    });
    
    if (selectedFeatures.length > 0 && selectedFeatures.length < geojson.features.length) {
        const group = new L.featureGroup(selectedFeatures.map(f => L.geoJson(f)));
        map.flyToBounds(group.getBounds(), { duration: 0.5 });
    } else {
        map.flyToBounds([[5.0, 97.0], [21.0, 106.0]], { duration: 0.5 });
    }
    
    // Update legend
    const grades = [0, maxVal*0.2, maxVal*0.4, maxVal*0.6, maxVal*0.8];
    let labels = [];
    for (let i = 0; i < grades.length; i++) {
        if (grades[i] === 0 && maxVal === 0) continue;
        const color = i === 4 ? '#14532d' : i === 3 ? '#166534' : i === 2 ? '#22c55e' : i === 1 ? '#4ade80' : '#86efac';
        labels.push(
            '<i style="background:' + color + '"></i> ' +
            compactFormatter.format(grades[i]) + (grades[i + 1] ? '&ndash;' + compactFormatter.format(grades[i + 1]) + '<br>' : '+')
        );
    }
    legend._div.innerHTML = labels.length ? labels.join('') : 'ไม่มีข้อมูล';
}

function renderMapStylesOnly() {
    if (!geojsonLayer) return;
    let maxVal = 0;
    allProvincesList.forEach(p => {
        if (!state.selectedProvinces.has(p)) return;
        const v = riceData.filter(d => d.name === p && state.years.has(d.year_be)).reduce((s,d) => s+(d[state.metric]||0),0);
        if(v > maxVal) maxVal = v;
    });
    
    geojsonLayer.eachLayer(layer => {
        const pName = getProvinceByPcode(layer.feature.properties.adm1_pcode);
        let color = '#e5e7eb';
        if (missingDataProvinces.has(pName)) color = '#d1d5db';
        else if (state.selectedProvinces.has(pName)) {
            const val = riceData.filter(d => d.name === pName && state.years.has(d.year_be)).reduce((s,d) => s+(d[state.metric]||0),0);
            if (val > 0) {
                const r = val / maxVal;
                color = r > 0.8 ? '#14532d' : r > 0.6 ? '#166534' : r > 0.4 ? '#22c55e' : r > 0.2 ? '#4ade80' : '#86efac';
            }
        }
        
        const isHovered = activeHoverItem === pName || activeHoverItem === provToRegion[pName];
        
        layer.setStyle({
            fillColor: color,
            weight: isHovered ? 2 : 1,
            opacity: 1,
            color: isHovered ? '#333' : 'white',
            dashArray: isHovered ? '' : '3',
            fillOpacity: isHovered ? 1 : 0.8
        });
        if(isHovered) layer.bringToFront();
    });
}

function highlightCharts(hoverItem) {
    [donutChart, barChart].forEach(chart => {
        if (!chart) return;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((element, index) => {
            const label = chart.data.labels[index];
            // Match exactly, or if hover is province and label is region, or vice versa
            const isMatch = (hoverItem === label) || 
                            (provToRegion[hoverItem] === label) || 
                            (provToRegion[label] === hoverItem);
            element.active = isMatch;
        });
        chart.update('none'); // Update without animation
    });
}

function updateCharts(data) {
    Chart.defaults.font.family = "'Noto Sans Thai', sans-serif";
    
    // Drill-down logic: If region mode and EXACTLY 1 region selected, show provinces
    const showProvinces = (state.viewMode === 'province') || (state.viewMode === 'region' && state.selectedRegions.size === 1);
    const groupKey = showProvinces ? 'name' : 'region';
    
    let metric = document.getElementById('metricSelect').value;
    if (metric.includes('yield')) metric = 'production_ton'; 
    
    // Accumulate totals for ALL valid items to draw the chart structure
    const allTotals = {};
    const itemsToDraw = showProvinces 
        ? allProvincesList.filter(p => state.selectedProvinces.has(p)) 
        : allRegionsList;

    riceData.forEach(d => {
        if (!state.years.has(d.year_be)) return;
        if (showProvinces && !state.selectedProvinces.has(d.name)) return;
        allTotals[d[groupKey]] = (allTotals[d[groupKey]] || 0) + (d[metric] || 0);
    });
    
    // For regions, ensure all regions exist even if 0
    if (!showProvinces) {
        allRegionsList.forEach(r => { if (!allTotals[r]) allTotals[r] = 0; });
    }
    
    const sorted = Object.keys(allTotals).map(k => ({k, v: allTotals[k]})).sort((a,b) => b.v - a.v);
    
    let dLabels = [], dData = [], dBgColors = [];
    
    sorted.forEach((s, index) => {
        if (index < 10) {
            dLabels.push(s.k);
            dData.push(s.v);
            
            const isSelected = showProvinces ? state.selectedProvinces.has(s.k) : state.selectedRegions.has(s.k);
            
            let color = showProvinces ? colors.pie[index % colors.pie.length] : regionColors[s.k];
            
            const allSelected = showProvinces ? state.selectedProvinces.size === allProvincesList.length : state.selectedRegions.size === allRegionsList.length;
            
            if (!isSelected && !allSelected) {
                color += '33'; // Fade out
            }
            dBgColors.push(color);
        }
    });
    
    if (sorted.length > 10) {
        dLabels.push('อื่นๆ');
        const otherSum = sorted.slice(10).reduce((sum, s) => sum + s.v, 0);
        dData.push(otherSum);
        dBgColors.push('#cbd5e1');
    }
    
    const metricText = metric === 'production_ton' ? 'ผลผลิต' : (metric === 'harvested_rai' ? 'เนื้อที่เก็บเกี่ยว' : 'เนื้อที่เพาะปลูก');
    document.getElementById('donutTitle').innerText = `สัดส่วน${metricText} ${showProvinces ? '(Top 10)' : '(6 ภูมิภาค)'}`;
    document.getElementById('barTitle').innerText = `เปรียบเทียบ${metricText} ${showProvinces ? 'รายจังหวัด' : 'รายภูมิภาค'}`;
    
    // Donut
    if (donutChart) {
        donutChart.data.labels = dLabels;
        donutChart.data.datasets[0].data = dData;
        donutChart.data.datasets[0].backgroundColor = dBgColors;
        donutChart.update();
    } else {
        const ctx = document.getElementById('donutChart').getContext('2d');
        donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: dLabels, datasets: [{ data: dData, backgroundColor: dBgColors }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                onHover: (e, elements) => {
                    if (elements.length > 0) {
                        const item = dLabels[elements[0].index];
                        if (item !== 'อื่นๆ' && item !== activeHoverItem) {
                            activeHoverItem = item;
                            renderMapStylesOnly();
                            highlightCharts(item);
                        }
                    } else if (activeHoverItem) {
                        activeHoverItem = null;
                        renderMapStylesOnly();
                        highlightCharts(null);
                    }
                },
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
                        if (clicked !== 'อื่นๆ') toggleLocationSelection(clicked, e.native.ctrlKey || e.native.shiftKey);
                    }
                }
            }
        });
    }

    // Bar Chart
    if (barChart) {
        barChart.data.labels = dLabels;
        barChart.data.datasets[0].data = dData;
        barChart.data.datasets[0].backgroundColor = dBgColors;
        barChart.update();
    } else {
        const ctx = document.getElementById('barChart').getContext('2d');
        barChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: dLabels, datasets: [{ data: dData, backgroundColor: dBgColors }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                indexAxis: 'y',
                onHover: (e, elements) => {
                    if (elements.length > 0) {
                        const item = dLabels[elements[0].index];
                        if (item !== 'อื่นๆ' && item !== activeHoverItem) {
                            activeHoverItem = item;
                            renderMapStylesOnly();
                            highlightCharts(item);
                        }
                    } else if (activeHoverItem) {
                        activeHoverItem = null;
                        renderMapStylesOnly();
                        highlightCharts(null);
                    }
                },
                plugins: { legend: { display: false } },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const clicked = dLabels[elements[0].index];
                        if (clicked !== 'อื่นๆ') toggleLocationSelection(clicked, e.native.ctrlKey || e.native.shiftKey);
                    }
                }
            }
        });
    }
    
    // Trend Chart (only selected data)
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
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const clickedYear = parseInt(trendChart.data.labels[elements[0].index]);
                        if (e.native.ctrlKey || e.native.shiftKey) {
                            if (state.years.has(clickedYear)) state.years.delete(clickedYear);
                            else state.years.add(clickedYear);
                        } else {
                            if (state.years.has(clickedYear) && state.years.size === 1) {
                                state.years = new Set([2565, 2566, 2567, 2568]);
                            } else {
                                state.years = new Set([clickedYear]);
                            }
                        }
                        if (state.years.size === 0) state.years = new Set([2565, 2566, 2567, 2568]);
                        render();
                    }
                },
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'ไร่' } },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'ตัน' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }
}
