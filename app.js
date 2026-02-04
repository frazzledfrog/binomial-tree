// Binomial Tree Option Pricing - Main Application

let renderer = null;
let currentTheme = 'bloomberg';

// DOM Elements
const elements = {
    spotPrice: null,
    strikePrice: null,
    riskFreeRate: null,
    volatility: null,
    timeToMaturity: null,
    numSteps: null,
    crrU: null,
    crrD: null,
    crrP: null,
    crrDt: null,
    crrUInput: null,
    crrDInput: null,
    optionPrice: null,
    delta: null,
    gamma: null,
    earlyExerciseInfo: null,
    earlyExerciseSection: null,
    treeCanvas: null,
    themeSelector: null,
    exportFormat: null,
    exportBtn: null
};

function init() {
    // Cache DOM elements
    elements.spotPrice = document.getElementById('spotPrice');
    elements.strikePrice = document.getElementById('strikePrice');
    elements.riskFreeRate = document.getElementById('riskFreeRate');
    elements.volatility = document.getElementById('volatility');
    elements.timeToMaturity = document.getElementById('timeToMaturity');
    elements.numSteps = document.getElementById('numSteps');
    elements.crrU = document.getElementById('crrU');
    elements.crrD = document.getElementById('crrD');
    elements.crrP = document.getElementById('crrP');
    elements.crrDt = document.getElementById('crrDt');
    elements.crrUInput = document.getElementById('crrUInput');
    elements.crrDInput = document.getElementById('crrDInput');
    elements.optionPrice = document.getElementById('optionPrice');
    elements.delta = document.getElementById('delta');
    elements.gamma = document.getElementById('gamma');
    elements.earlyExerciseInfo = document.getElementById('earlyExerciseInfo');
    elements.earlyExerciseSection = document.getElementById('earlyExerciseSection');
    elements.treeCanvas = document.getElementById('treeCanvas');
    elements.themeSelector = document.getElementById('themeSelect');
    elements.exportFormat = document.getElementById('exportFormat');
    elements.exportBtn = document.getElementById('exportBtn');
    
    // Initialize renderer
    renderer = initTreeRenderer(elements.treeCanvas);
    
    // Set up event listeners
    setupEventListeners();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('binomial-tree-theme') || 'bloomberg';
    setTheme(savedTheme);
    
    // Initial calculation
    calculate();
}

function setupEventListeners() {
    // Input changes trigger recalculation
    const inputs = [
        elements.spotPrice,
        elements.strikePrice,
        elements.riskFreeRate,
        elements.volatility,
        elements.timeToMaturity,
        elements.numSteps
    ];
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce(calculate, 150));
    });
    
    // Radio buttons for option type and exercise style
    document.querySelectorAll('input[name="optionType"]').forEach(radio => {
        radio.addEventListener('change', calculate);
    });
    
    document.querySelectorAll('input[name="exerciseStyle"]').forEach(radio => {
        radio.addEventListener('change', calculate);
    });
    
    // CRR mode toggle
    document.querySelectorAll('input[name="crrMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isCustom = document.querySelector('input[name="crrMode"]:checked').value === 'custom';
            elements.crrUInput.disabled = !isCustom;
            elements.crrDInput.disabled = !isCustom;
            elements.crrU.style.display = isCustom ? 'none' : '';
            elements.crrD.style.display = isCustom ? 'none' : '';
            elements.crrUInput.style.display = isCustom ? '' : 'none';
            elements.crrDInput.style.display = isCustom ? '' : 'none';
            calculate();
        });
    });
    
    // Custom u/d inputs
    elements.crrUInput.addEventListener('input', debounce(calculate, 150));
    elements.crrDInput.addEventListener('input', debounce(calculate, 150));
    
    // Theme selector
    elements.themeSelector.addEventListener('change', (e) => {
        setTheme(e.target.value);
    });
    
    // Export button
    elements.exportBtn.addEventListener('click', exportData);
}

function getParams() {
    const S = parseFloat(elements.spotPrice.value) || 100;
    const K = parseFloat(elements.strikePrice.value) || 100;
    const r = (parseFloat(elements.riskFreeRate.value) || 5) / 100;
    const sigma = (parseFloat(elements.volatility.value) || 20) / 100;
    const T = parseFloat(elements.timeToMaturity.value) || 1;
    const N = parseInt(elements.numSteps.value) || 3;
    const isCall = document.querySelector('input[name="optionType"]:checked').value === 'call';
    const isAmerican = document.querySelector('input[name="exerciseStyle"]:checked').value === 'american';
    const isCustomUD = document.querySelector('input[name="crrMode"]:checked').value === 'custom';
    const customU = parseFloat(elements.crrUInput.value) || 1.1;
    const customD = parseFloat(elements.crrDInput.value) || 0.9;
    
    return { S, K, r, sigma, T, N: Math.min(Math.max(N, 1), 20), isCall, isAmerican, isCustomUD, customU, customD };
}

function calculate() {
    const params = getParams();
    
    // Price the option
    const result = priceBinomialTree(params);
    
    // Update CRR display
    elements.crrU.textContent = result.crr.u.toFixed(6);
    elements.crrD.textContent = result.crr.d.toFixed(6);
    elements.crrP.textContent = result.crr.p.toFixed(6);
    elements.crrDt.textContent = result.crr.dt.toFixed(6);
    
    // Update results
    elements.optionPrice.textContent = '$' + result.price.toFixed(4);
    elements.delta.textContent = result.delta.toFixed(4);
    elements.gamma.textContent = result.gamma.toFixed(6);
    
    // Update early exercise section
    if (params.isAmerican && result.earlyExerciseNodes.length > 0) {
        elements.earlyExerciseSection.style.display = 'block';
        elements.earlyExerciseInfo.innerHTML = result.earlyExerciseNodes
            .map(node => `<div class="early-exercise-item">
                Step ${node.step}, State ${node.state}: S=$${node.stockPrice.toFixed(2)}, V=$${node.optionValue.toFixed(2)}
            </div>`)
            .join('');
    } else {
        elements.earlyExerciseSection.style.display = 'none';
    }
    
    // Update tree visualization
    renderer.setColors(getTreeColors(currentTheme));
    renderer.setData(result);
    renderer.render();
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    elements.themeSelector.value = theme;
    localStorage.setItem('binomial-tree-theme', theme);
    
    // Re-render tree with new colors
    if (renderer && renderer.data) {
        renderer.setColors(getTreeColors(theme));
        renderer.render();
    }
}

function exportData() {
    const format = elements.exportFormat.value;
    const params = getParams();
    const result = priceBinomialTree(params);
    
    if (format === 'png') {
        exportPNG();
    } else {
        exportCSV(params, result);
    }
}

function exportPNG() {
    const dataURL = renderer.getCanvasDataURL();
    const link = document.createElement('a');
    link.download = 'binomial-tree.png';
    link.href = dataURL;
    link.click();
}

function exportCSV(params, result) {
    let csv = '';
    
    // Settings
    csv += 'SETTINGS\n';
    csv += `Spot Price,$${params.S}\n`;
    csv += `Strike Price,$${params.K}\n`;
    csv += `Risk-Free Rate,${(params.r * 100).toFixed(2)}%\n`;
    csv += `Volatility,${(params.sigma * 100).toFixed(2)}%\n`;
    csv += `Time to Maturity,${params.T} years\n`;
    csv += `Steps,${params.N}\n`;
    csv += `Option Type,${params.isCall ? 'Call' : 'Put'}\n`;
    csv += `Exercise Style,${params.isAmerican ? 'American' : 'European'}\n`;
    csv += '\n';
    
    // CRR Parameters
    csv += 'CRR PARAMETERS\n';
    csv += `u,${result.crr.u.toFixed(6)}\n`;
    csv += `d,${result.crr.d.toFixed(6)}\n`;
    csv += `p,${result.crr.p.toFixed(6)}\n`;
    csv += `dt,${result.crr.dt.toFixed(6)}\n`;
    csv += '\n';
    
    // Results
    csv += 'RESULTS\n';
    csv += `Option Price,$${result.price.toFixed(4)}\n`;
    csv += `Delta,${result.delta.toFixed(4)}\n`;
    csv += `Gamma,${result.gamma.toFixed(6)}\n`;
    csv += '\n';
    
    // Tree Data
    csv += 'TREE DATA\n';
    csv += 'Step,State,Stock Price,Option Value,Early Exercise\n';
    
    for (let i = 0; i <= params.N; i++) {
        for (let j = 0; j <= i; j++) {
            csv += `${i},${j},${result.stockTree[i][j].toFixed(4)},${result.optionTree[i][j].toFixed(4)},${result.earlyExercise[i][j] ? 'Yes' : 'No'}\n`;
        }
    }
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'binomial-tree-data.csv';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for inline handlers
window.setTheme = setTheme;
window.recalculate = calculate;
window.exportTree = exportData;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
