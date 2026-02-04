// Binomial Tree Visualization - Canvas Rendering

let treeRenderer = null;

class TreeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = null;
        this.colors = null;
    }
    
    setColors(colors) {
        this.colors = colors;
    }
    
    setData(data) {
        this.data = data;
    }
    
    resize() {
        const wrapper = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = wrapper.clientWidth * dpr;
        this.canvas.height = wrapper.clientHeight * dpr;
        this.canvas.style.width = wrapper.clientWidth + 'px';
        this.canvas.style.height = wrapper.clientHeight + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.width = wrapper.clientWidth;
        this.height = wrapper.clientHeight;
    }
    
    render() {
        if (!this.data || !this.colors) return;
        
        this.resize();
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const { stockTree, optionTree, earlyExercise } = this.data;
        const N = stockTree.length - 1;
        
        if (N === 0) return;
        
        // Calculate layout
        const padding = { top: 40, right: 60, bottom: 40, left: 60 };
        const availableWidth = this.width - padding.left - padding.right;
        const availableHeight = this.height - padding.top - padding.bottom;
        
        // Node sizing based on tree depth
        const nodeRadius = Math.max(8, Math.min(25, 200 / (N + 1)));
        const fontSize = Math.max(7, Math.min(11, 100 / (N + 1)));
        
        // Calculate positions for all nodes
        const positions = this.calculatePositions(N, padding, availableWidth, availableHeight);
        
        // Draw edges first (behind nodes)
        this.drawEdges(positions, N);
        
        // Draw nodes
        this.drawNodes(positions, stockTree, optionTree, earlyExercise, N, nodeRadius, fontSize);
        
        // Draw labels
        this.drawLabels(N, padding, availableWidth, fontSize);
    }
    
    calculatePositions(N, padding, availableWidth, availableHeight) {
        const positions = [];
        const stepWidth = availableWidth / N;
        
        for (let i = 0; i <= N; i++) {
            positions[i] = [];
            const numNodes = i + 1;
            const stepHeight = availableHeight / (N + 1);
            const startY = padding.top + (N - i) * stepHeight / 2;
            
            for (let j = 0; j <= i; j++) {
                const x = padding.left + i * stepWidth;
                const y = startY + j * stepHeight;
                positions[i][j] = { x, y };
            }
        }
        
        return positions;
    }
    
    drawEdges(positions, N) {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < N; i++) {
            for (let j = 0; j <= i; j++) {
                const from = positions[i][j];
                
                // Up edge
                const toUp = positions[i + 1][j + 1];
                this.ctx.beginPath();
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(toUp.x, toUp.y);
                this.ctx.stroke();
                
                // Down edge
                const toDown = positions[i + 1][j];
                this.ctx.beginPath();
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(toDown.x, toDown.y);
                this.ctx.stroke();
            }
        }
    }
    
    drawNodes(positions, stockTree, optionTree, earlyExercise, N, radius, fontSize) {
        this.ctx.font = `${fontSize}px Consolas, Monaco, monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= N; i++) {
            for (let j = 0; j <= i; j++) {
                const pos = positions[i][j];
                const isTerminal = (i === N);
                const isEarlyExercise = earlyExercise[i] && earlyExercise[i][j];
                
                // Determine node color
                let fillColor, strokeColor;
                if (isEarlyExercise) {
                    fillColor = this.colors.exercise;
                    strokeColor = this.colors.exercise;
                } else if (isTerminal) {
                    fillColor = this.colors.terminal;
                    strokeColor = this.colors.terminal;
                } else {
                    fillColor = this.colors.nodeFill;
                    strokeColor = this.colors.nodeStroke;
                }
                
                // Draw node circle
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = fillColor;
                this.ctx.fill();
                this.ctx.strokeStyle = strokeColor;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
                
                // Draw stock price above node
                const stockPrice = stockTree[i][j];
                const optionValue = optionTree[i][j];
                
                this.ctx.fillStyle = this.colors.text;
                
                // Only show values if tree isn't too large
                if (N <= 10) {
                    this.ctx.fillText(stockPrice.toFixed(1), pos.x, pos.y - radius - fontSize * 0.8);
                    
                    // Option value inside or below node
                    this.ctx.fillStyle = isEarlyExercise ? this.colors.exerciseText : this.colors.valueText;
                    this.ctx.fillText(optionValue.toFixed(2), pos.x, pos.y + radius + fontSize * 0.8);
                } else if (N <= 15) {
                    // Abbreviated for medium trees
                    this.ctx.font = `${fontSize * 0.8}px Consolas, Monaco, monospace`;
                    this.ctx.fillText(stockPrice.toFixed(0), pos.x, pos.y - radius - fontSize * 0.6);
                }
            }
        }
    }
    
    drawLabels(N, padding, availableWidth, fontSize) {
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = `${Math.max(9, fontSize)}px Consolas, Monaco, monospace`;
        this.ctx.textAlign = 'center';
        
        // Step labels at top
        const stepWidth = availableWidth / N;
        for (let i = 0; i <= N; i++) {
            const x = padding.left + i * stepWidth;
            this.ctx.fillText(`t=${i}`, x, 15);
        }
    }
    
    getCanvasDataURL() {
        return this.canvas.toDataURL('image/png');
    }
}

function initTreeRenderer(canvas) {
    treeRenderer = new TreeRenderer(canvas);
    window.addEventListener('resize', () => {
        if (treeRenderer && treeRenderer.data) {
            treeRenderer.render();
        }
    });
    return treeRenderer;
}

function getTreeColors(theme) {
    const themes = {
        bloomberg: {
            grid: '#333',
            text: '#888',
            nodeFill: '#1a1a1a',
            nodeStroke: '#ff9900',
            exercise: '#00ff00',
            exerciseText: '#000',
            terminal: '#555',
            valueText: '#ff9900'
        },
        light: {
            grid: '#ddd',
            text: '#666',
            nodeFill: '#fff',
            nodeStroke: '#2563eb',
            exercise: '#16a34a',
            exerciseText: '#fff',
            terminal: '#999',
            valueText: '#2563eb'
        },
        matrix: {
            grid: '#003300',
            text: '#00aa00',
            nodeFill: '#0a0a0a',
            nodeStroke: '#00ff00',
            exercise: '#00ff00',
            exerciseText: '#000',
            terminal: '#005500',
            valueText: '#00ff00'
        },
        midnight: {
            grid: '#334155',
            text: '#94a3b8',
            nodeFill: '#1e293b',
            nodeStroke: '#38bdf8',
            exercise: '#4ade80',
            exerciseText: '#0f172a',
            terminal: '#475569',
            valueText: '#38bdf8'
        },
        sunset: {
            grid: '#e94560',
            text: '#c4c4c4',
            nodeFill: '#16213e',
            nodeStroke: '#ff6b6b',
            exercise: '#4ecdc4',
            exerciseText: '#1a1a2e',
            terminal: '#e94560',
            valueText: '#feca57'
        },
        pink: {
            grid: '#ff69b4',
            text: '#d4a5d4',
            nodeFill: '#3d2745',
            nodeStroke: '#ff69b4',
            exercise: '#ff1493',
            exerciseText: '#2d1b2e',
            terminal: '#8b4570',
            valueText: '#ffb3d9'
        },
        laurier: {
            grid: '#6a3fb5',
            text: '#d4af37',
            nodeFill: '#2e1a52',
            nodeStroke: '#ffd700',
            exercise: '#ffd700',
            exerciseText: '#1a0f2e',
            terminal: '#4a2882',
            valueText: '#ffd700'
        }
    };
    
    return themes[theme] || themes.bloomberg;
}
