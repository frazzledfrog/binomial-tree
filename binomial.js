// Binomial Tree Option Pricing - Core Calculations

/**
 * Calculate CRR (Cox-Ross-Rubinstein) parameters
 */
function calculateCRRParams(S, K, r, sigma, T, N, customU, customD) {
    const dt = T / N;
    let u, d;
    
    if (customU !== undefined && customD !== undefined) {
        u = customU;
        d = customD;
    } else {
        u = Math.exp(sigma * Math.sqrt(dt));
        d = 1 / u;
    }
    
    const p = (Math.exp(r * dt) - d) / (u - d);
    
    return { dt, u, d, p, discount: Math.exp(-r * dt) };
}

/**
 * Build the stock price tree
 * Returns a 2D array where tree[i][j] is the stock price at step i, state j
 * j represents number of up moves
 */
function buildStockTree(S, u, d, N) {
    const tree = [];
    
    for (let i = 0; i <= N; i++) {
        tree[i] = [];
        for (let j = 0; j <= i; j++) {
            // j up moves, (i-j) down moves
            tree[i][j] = S * Math.pow(u, j) * Math.pow(d, i - j);
        }
    }
    
    return tree;
}

/**
 * Calculate option payoff at expiration
 */
function payoff(S, K, isCall) {
    if (isCall) {
        return Math.max(S - K, 0);
    } else {
        return Math.max(K - S, 0);
    }
}

/**
 * Price European option using backward induction
 */
function priceEuropean(stockTree, K, p, discount, isCall, N) {
    const optionTree = [];
    const earlyExercise = []; // Not used for European, but keep for consistency
    
    // Initialize all steps
    for (let i = 0; i <= N; i++) {
        optionTree[i] = [];
        earlyExercise[i] = [];
    }
    
    // Terminal payoffs
    for (let j = 0; j <= N; j++) {
        optionTree[N][j] = payoff(stockTree[N][j], K, isCall);
        earlyExercise[N][j] = false;
    }
    
    // Backward induction
    for (let i = N - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            const holdValue = discount * (p * optionTree[i + 1][j + 1] + (1 - p) * optionTree[i + 1][j]);
            optionTree[i][j] = holdValue;
            earlyExercise[i][j] = false;
        }
    }
    
    return { optionTree, earlyExercise };
}

/**
 * Price American option using backward induction with early exercise
 */
function priceAmerican(stockTree, K, p, discount, isCall, N) {
    const optionTree = [];
    const earlyExercise = [];
    
    // Initialize all steps
    for (let i = 0; i <= N; i++) {
        optionTree[i] = [];
        earlyExercise[i] = [];
    }
    
    // Terminal payoffs
    for (let j = 0; j <= N; j++) {
        optionTree[N][j] = payoff(stockTree[N][j], K, isCall);
        earlyExercise[N][j] = false; // Terminal nodes are not early exercise
    }
    
    // Backward induction with early exercise check
    for (let i = N - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            const holdValue = discount * (p * optionTree[i + 1][j + 1] + (1 - p) * optionTree[i + 1][j]);
            const exerciseValue = payoff(stockTree[i][j], K, isCall);
            
            if (exerciseValue > holdValue) {
                optionTree[i][j] = exerciseValue;
                earlyExercise[i][j] = true;
            } else {
                optionTree[i][j] = holdValue;
                earlyExercise[i][j] = false;
            }
        }
    }
    
    return { optionTree, earlyExercise };
}

/**
 * Calculate Delta from the tree
 * Delta = (V_u - V_d) / (S_u - S_d)
 */
function calculateDelta(stockTree, optionTree) {
    if (stockTree.length < 2) return 0;
    
    const Su = stockTree[1][1];
    const Sd = stockTree[1][0];
    const Vu = optionTree[1][1];
    const Vd = optionTree[1][0];
    
    return (Vu - Vd) / (Su - Sd);
}

/**
 * Calculate Gamma from the tree
 * Gamma = ((delta_up - delta_down) / (0.5 * (S_uu - S_dd)))
 */
function calculateGamma(stockTree, optionTree) {
    if (stockTree.length < 3) return 0;
    
    const Suu = stockTree[2][2];
    const Sud = stockTree[2][1];
    const Sdd = stockTree[2][0];
    
    const Vuu = optionTree[2][2];
    const Vud = optionTree[2][1];
    const Vdd = optionTree[2][0];
    
    const deltaUp = (Vuu - Vud) / (Suu - Sud);
    const deltaDown = (Vud - Vdd) / (Sud - Sdd);
    
    const h = 0.5 * (Suu - Sdd);
    
    return (deltaUp - deltaDown) / h;
}

/**
 * Get list of early exercise nodes
 */
function getEarlyExerciseNodes(stockTree, optionTree, earlyExercise, N) {
    const nodes = [];
    
    for (let i = 0; i < N; i++) { // Exclude terminal nodes
        for (let j = 0; j <= i; j++) {
            if (earlyExercise[i][j]) {
                nodes.push({
                    step: i,
                    state: j,
                    stockPrice: stockTree[i][j],
                    optionValue: optionTree[i][j]
                });
            }
        }
    }
    
    return nodes;
}

/**
 * Main pricing function - returns all results
 */
function priceBinomialTree(params) {
    const { S, K, r, sigma, T, N, isCall, isAmerican, isCustomUD, customU, customD } = params;
    
    // Calculate CRR parameters
    const crr = isCustomUD 
        ? calculateCRRParams(S, K, r, sigma, T, N, customU, customD)
        : calculateCRRParams(S, K, r, sigma, T, N);
    
    // Build stock price tree
    const stockTree = buildStockTree(S, crr.u, crr.d, N);
    
    // Price the option
    const { optionTree, earlyExercise } = isAmerican
        ? priceAmerican(stockTree, K, crr.p, crr.discount, isCall, N)
        : priceEuropean(stockTree, K, crr.p, crr.discount, isCall, N);
    
    // Calculate Greeks
    const delta = calculateDelta(stockTree, optionTree);
    const gamma = calculateGamma(stockTree, optionTree);
    
    // Get early exercise info
    const earlyExerciseNodes = isAmerican
        ? getEarlyExerciseNodes(stockTree, optionTree, earlyExercise, N)
        : [];
    
    return {
        crr,
        stockTree,
        optionTree,
        earlyExercise,
        price: optionTree[0][0],
        delta,
        gamma,
        earlyExerciseNodes
    };
}
