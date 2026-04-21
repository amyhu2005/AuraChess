const chess = new Chess();
let boardEl = document.getElementById('chessboard');
let orientation = 'w'; // 'w' or 'b'
let selectedSquare = null;
let lastMove = null;
let draggedPieceSquare = null;
let forwardQueue = [];

// Github Lichess Piece SVGs
const PIECE_URLS = {
  'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bP.svg',
  'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bN.svg',
  'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bB.svg',
  'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bR.svg',
  'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bQ.svg',
  'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bK.svg',
  'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wP.svg',
  'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wN.svg',
  'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wB.svg',
  'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wR.svg',
  'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wQ.svg',
  'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wK.svg'
};

let globalPieceToggles = {};
let globalTargetToggles = {};
let globalModeWinning = true;
let globalModeComprehensive = true;
let globalModeSkewers = true;
let globalModeTrivial = true;

const initToggles = () => {
    const files = ['a','b','c','d','e','f','g','h'];
    for(let r=1; r<=8; r++) {
       for(let i=0; i<8; i++) {
           globalTargetToggles[files[i] + r] = true;
       }
    }
    
    for(let i=0;i<8;i++) {
        globalPieceToggles['w_p_' + files[i]] = true;
        globalPieceToggles['b_p_' + files[i]] = true;
    }
    ['w_r_a','w_n_b','w_b_c','w_q','w_k','w_b_f','w_n_g','w_r_h'].forEach(id => globalPieceToggles[id] = true);
    ['b_r_a','b_n_b','b_b_c','b_q','b_k','b_b_f','b_n_g','b_r_h'].forEach(id => globalPieceToggles[id] = true);
};
initToggles();

function getPieceTrackingMap() {
    let map = {};
    const files = ['a','b','c','d','e','f','g','h'];
    for(let i=0;i<8;i++) {
        map[files[i]+'2'] = 'w_p_' + files[i];
        map[files[i]+'7'] = 'b_p_' + files[i];
    }
    map['a1']='w_r_a'; map['b1']='w_n_b'; map['c1']='w_b_c'; map['d1']='w_q'; map['e1']='w_k'; map['f1']='w_b_f'; map['g1']='w_n_g'; map['h1']='w_r_h';
    map['a8']='b_r_a'; map['b8']='b_n_b'; map['c8']='b_b_c'; map['d8']='b_q'; map['e8']='b_k'; map['f8']='b_b_f'; map['g8']='b_n_g'; map['h8']='b_r_h';
    
    const history = chess.history({verbose: true});
    for(let move of history) {
        map[move.to] = map[move.from];
        delete map[move.from];
        if (move.flags.includes('k')) {
            if(move.color==='w') { map['f1']=map['h1']; delete map['h1']; }
            else { map['f8']=map['h8']; delete map['h8']; }
        } else if (move.flags.includes('q')) {
            if(move.color==='w') { map['d1']=map['a1']; delete map['a1']; }
            else { map['d8']=map['a8']; delete map['a8']; }
        }
    }
    return map;
}

function renderToggles() {
    const wContainer = document.getElementById('white-toggles-container');
    const bContainer = document.getElementById('black-toggles-container');
    if (!wContainer || !bContainer) return;
    
    wContainer.innerHTML = '<h4 style="color: #60a5fa">White</h4>';
    bContainer.innerHTML = '<h4 style="color: #f87171">Black</h4>';
    
    const map = getPieceTrackingMap();
    const boardState = chess.board();
    const files = ['a','b','c','d','e','f','g','h'];
    const typeNames = { 'p':'Pawn', 'n':'Knight', 'b':'Bishop', 'r':'Rook', 'q':'Queen', 'k':'King' };
    
    const wPieces = [];
    const bPieces = [];
    
    for(let r=0; r<8; r++) {
       for(let f=0; f<8; f++) {
          const piece = boardState[r][f];
          if (piece) {
             const sq = files[f] + (8-r);
             const id = map[sq];
             const label = `${typeNames[piece.type]} (${sq})`;
             if (piece.color === 'w') wPieces.push({id, label});
             else bPieces.push({id, label});
          }
       }
    }
    
    const renderList = (pieces, container) => {
       pieces.forEach(p => {
           const lbl = document.createElement('label');
           const chk = document.createElement('input');
           chk.type = 'checkbox';
           chk.checked = !!globalPieceToggles[p.id];
           chk.addEventListener('change', (e) => {
               globalPieceToggles[p.id] = e.target.checked;
               renderBoard();
           });
           lbl.appendChild(chk);
           lbl.appendChild(document.createTextNode(' ' + p.label));
           container.appendChild(lbl);
       });
    };
    
    renderList(wPieces, wContainer);
    renderList(bPieces, bContainer);
}

function renderTargetGrid() {
    const gridEl = document.getElementById('mini-target-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    
    const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const mapFiles = orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    
    ranks.forEach((r, rIdx) => {
        mapFiles.forEach((f, fIdx) => {
            const sq = f + r;
            const cell = document.createElement('div');
            const isLight = (rIdx + fIdx) % 2 === 0;
            cell.className = `mini-square ${isLight ? 'light' : 'dark'}`;
            if (!globalTargetToggles[sq]) {
                 cell.classList.add('off');
            }
            
            cell.title = sq;
            cell.addEventListener('click', () => {
                globalTargetToggles[sq] = !globalTargetToggles[sq];
                renderTargetGrid();
                renderBoard();
            });
            gridEl.appendChild(cell);
        });
    });
}

const dirs = {
  'n': [[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]],
  'b': [[1,1],[1,-1],[-1,1],[-1,-1]],
  'r': [[1,0],[-1,0],[0,1],[0,-1]],
  'q': [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]],
  'k': [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]
};

function getAttackedSquares(f, r, type, color, boardState) {
  const files = ['a','b','c','d','e','f','g','h'];
  let targets = [];
  
  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1; 
    const attackCols = [f - 1, f + 1];
    attackCols.forEach(af => {
      if (af >= 0 && af < 8) {
        const ar = r + dir;
        if (ar >= 0 && ar < 8) {
          targets.push(files[af] + (8 - ar));
        }
      }
    });
    return targets;
  }
  
  const vecs = dirs[type];
  vecs.forEach(v => {
    let cf = f;
    let cr = r;
    while (true) {
      cf += v[0];
      cr += v[1];
      if (cf < 0 || cf > 7 || cr < 0 || cr > 7) break;
      targets.push(files[cf] + (8 - cr));
      if (boardState[cr][cf]) {
          if (!globalModeComprehensive) {
              break;
          } else {
              const blocker = boardState[cr][cf];
              const isOrthogonal = (v[0] === 0 || v[1] === 0);
              const isDiagonal = (Math.abs(v[0]) === Math.abs(v[1]));
              
              let transmitsContinuously = false;
              let transmitsOnceIfEnemy = false;

              if (blocker.type === 'q') transmitsContinuously = true;
              else if (blocker.type === 'r' && isOrthogonal) transmitsContinuously = true;
              else if (blocker.type === 'b' && isDiagonal) transmitsContinuously = true;
              else if (blocker.type === 'p' && isDiagonal && blocker.color === color) {
                  const isForward = (color === 'w') ? (v[1] === -1) : (v[1] === 1);
                  if (isForward) {
                      transmitsOnceIfEnemy = true;
                  }
              }

              if (transmitsContinuously) {
                  // Keep slicing through
              } else if (transmitsOnceIfEnemy) {
                  // Check exactly one square ahead for an enemy piece target
                  let nf = cf + v[0];
                  let nr = cr + v[1];
                  if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                      const nextPiece = boardState[nr][nf];
                      if (nextPiece && nextPiece.color !== color) {
                          targets.push(files[nf] + (8 - nr));
                      }
                  }
                  break; // Always break after pawn evaluation
              } else {
                  break;
              }
          }
      }
      if (type === 'n' || type === 'k') break;
    }
  });
  return targets;
}

const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 1000 };

function checkPinStatus(boardState) {
    let pinnedSquares = {};
    const files = ['a','b','c','d','e','f','g','h'];
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const pieceB = boardState[r][f];
            if (!pieceB) continue;
            
            const colorB = pieceB.color;
            const valB = pieceValues[pieceB.type];
            let isPinned = false;
            
            const allDirs = [...dirs['r'], ...dirs['b']];
            for (let d of allDirs) {
                let hasEnemySlider = false;
                let cf = f; let cr = r;
                while (true) {
                    cf += d[0]; cr += d[1];
                    if (cf < 0 || cf > 7 || cr < 0 || cr > 7) break;
                    const p = boardState[cr][cf];
                    if (p) {
                        if (p.color !== colorB) {
                            if (p.type === 'q') hasEnemySlider = true;
                            else if (p.type === 'r' && (d[0] === 0 || d[1] === 0)) hasEnemySlider = true;
                            else if (p.type === 'b' && Math.abs(d[0]) === Math.abs(d[1])) hasEnemySlider = true;
                        }
                        break;
                    }
                }
                
                if (hasEnemySlider) {
                    let opDr = [-d[0], -d[1]];
                    let cf2 = f; let cr2 = r;
                    while (true) {
                        cf2 += opDr[0]; cr2 += opDr[1];
                        if (cf2 < 0 || cf2 > 7 || cr2 < 0 || cr2 > 7) break;
                        const p2 = boardState[cr2][cf2];
                        if (p2) {
                            if (p2.color === colorB && pieceValues[p2.type] > valB) {
                                isPinned = true;
                            }
                            break;
                        }
                    }
                }
                if (isPinned) break;
            }
            if (isPinned) {
                pinnedSquares[files[f] + (8 - r)] = true;
            }
        }
    }
    return pinnedSquares;
}

function calculateCoverage() {
  const coverage = { w: {}, b: {} };
  const boardState = chess.board(); 
  const files = ['a','b','c','d','e','f','g','h'];
  const map = getPieceTrackingMap();
  
  const pinnedSquares = globalModeSkewers ? checkPinStatus(boardState) : {};
  
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = boardState[r][f];
      if (!piece) continue;
      
      const sq = files[f] + (8-r);
      const id = map[sq];
      
      if (!globalPieceToggles[id]) continue;
      if (pinnedSquares[sq]) continue;
      
      const targets = getAttackedSquares(f, r, piece.type, piece.color, boardState);
      targets.forEach(t => {
        if (!coverage[piece.color][t]) coverage[piece.color][t] = 0;
        coverage[piece.color][t]++;
      });
    }
  }
  return coverage;
}

function renderBoard() {
  boardEl.innerHTML = '';
  
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  
  const coverageMap = calculateCoverage();
  const whiteColors = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8']; // Blue shades
  const blackColors = ['#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c']; // Red shades
  
  ranks.forEach((rank, rIdx) => {
    files.forEach((file, fIdx) => {
      const square = file + rank;
      const isLight = (rIdx + fIdx) % 2 === 0;
      
      const sqEl = document.createElement('div');
      sqEl.className = `square ${isLight ? 'light' : 'dark'}`;
      sqEl.id = square;
      sqEl.dataset.square = square;
      
      if (lastMove && (square === lastMove.from || square === lastMove.to)) {
        sqEl.classList.add('last-move');
      }
      
      if (selectedSquare === square) {
        sqEl.classList.add('selected');
      }

      if (rIdx === 7) {
        const fileCoord = document.createElement('span');
        fileCoord.className = 'coord file';
        fileCoord.textContent = file;
        sqEl.appendChild(fileCoord);
      }
      if (fIdx === 0) {
        const rankCoord = document.createElement('span');
        rankCoord.className = 'coord rank';
        rankCoord.textContent = rank;
        sqEl.appendChild(rankCoord);
      }
      
      // Coverage Display
      const wCov = coverageMap.w[square] || 0;
      const bCov = coverageMap.b[square] || 0;
      
      // If either side has absolutely 0 coverage, the square is un-contested (trivial)
      let isTrivial = globalModeTrivial && (wCov === 0 || bCov === 0);
      
      if (isTrivial && globalModeTrivial) {
          const occPiece = chess.get(square);
          if (occPiece) {
              // A free hanging capture is immensely important and never trivial
              if (occPiece.color === 'w' && bCov > 0 && wCov === 0) isTrivial = false;
              else if (occPiece.color === 'b' && wCov > 0 && bCov === 0) isTrivial = false;
          }
      }
      
      if (!isTrivial && globalTargetToggles[square]) {
          if (globalModeWinning) {
              if (wCov > bCov) sqEl.classList.add('winning-w');
              else if (bCov > wCov) sqEl.classList.add('winning-b');
          }
          
          if (wCov > 0 || bCov > 0) {
            const covEl = document.createElement('div');
            covEl.className = 'coverage-hover-display';
            covEl.textContent = `(W${wCov}|B${bCov})`;
            sqEl.appendChild(covEl);
          }
      }
      
      // Piece
      const piece = chess.get(square);
      if (piece) {
        const pEl = document.createElement('div');
        pEl.className = 'piece';
        const pKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        pEl.style.backgroundImage = `url(${PIECE_URLS[pKey]})`;
        pEl.draggable = true;
        pEl.dataset.square = square;
        sqEl.appendChild(pEl);
      }
      
      boardEl.appendChild(sqEl);
    });
  });
  
  if (selectedSquare) {
      highlightValidMoves(selectedSquare);
  }

  updateStatus();
  updateHistory();
  renderToggles();
  renderTargetGrid();
  attachEventListeners();
}

function attachEventListeners() {
  const squares = document.querySelectorAll('.square');
  const pieces = document.querySelectorAll('.piece');
  
  squares.forEach(sq => {
    sq.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    sq.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetSquare = sq.dataset.square;
      if (draggedPieceSquare && draggedPieceSquare !== targetSquare) {
        handleMove(draggedPieceSquare, targetSquare);
      }
      draggedPieceSquare = null;
    });
    
    sq.addEventListener('click', (e) => {
      // Prevent double trigger if we clicked a piece inside the square
      if (e.target.classList.contains('piece')) {
          return;
      }
      handleSquareClick(sq.dataset.square);
    });
  });
  
  pieces.forEach(p => {
    p.addEventListener('dragstart', (e) => {
      draggedPieceSquare = p.dataset.square;
      setTimeout(() => p.classList.add('dragging'), 0);
      selectedSquare = draggedPieceSquare;
      renderBoard();
    });
    
    p.addEventListener('dragend', (e) => {
      p.classList.remove('dragging');
      // Only clear if no valid drop happened
      if (!lastMove || (lastMove.from !== draggedPieceSquare)) {
           // wait, determining if drop was valid is better handled in drop event
      }
    });
    
    p.addEventListener('click', (e) => {
      handleSquareClick(p.dataset.square);
      e.stopPropagation();
    });
  });
}

function handleSquareClick(sq) {
  if (selectedSquare) {
    const success = handleMove(selectedSquare, sq);
    if (!success) {
      const piece = chess.get(sq);
      if (piece && piece.color === chess.turn()) {
        // Change selection
        selectedSquare = sq;
      } else {
        // Deselect
        selectedSquare = null;
      }
      renderBoard();
    }
  } else {
    const piece = chess.get(sq);
    if (piece && piece.color === chess.turn()) {
      selectedSquare = sq;
      renderBoard();
    }
  }
}

function handleMove(from, to) {
  const moveObj = chess.move({ from, to, promotion: 'q' });
  if (moveObj) {
    selectedSquare = null;
    lastMove = { from, to };
    forwardQueue = [];
    renderBoard();
    return true;
  }
  return false;
}

function highlightValidMoves(square) {
  const moves = chess.moves({ square: square, verbose: true });
  moves.forEach(m => {
    const el = document.getElementById(m.to);
    if (el) {
      if (m.captured) {
          el.classList.add('valid-capture');
      } else {
          el.classList.add('valid-move');
      }
    }
  });
}

function updateStatus() {
  const turnDotEl = document.getElementById('status-indicator');
  const turnTextEl = document.getElementById('turn-text');
  const gameStateEl = document.getElementById('game-state-text');
  
  if (chess.turn() === 'w') {
    turnDotEl.className = 'status-value white-turn';
    turnTextEl.textContent = 'White to move';
  } else {
    turnDotEl.className = 'status-value black-turn';
    turnTextEl.textContent = 'Black to move';
  }
  
  let state = 'Game in progress';
  if (chess.in_checkmate()) {
    state = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`;
  } else if (chess.in_draw()) {
    state = 'Draw';
  } else if (chess.in_check()) {
    state = 'Check!';
  }
  
  gameStateEl.textContent = state;
}

function updateHistory() {
  const historyEl = document.getElementById('move-history');
  historyEl.innerHTML = '';
  
  const history = chess.history();
  
  for (let i = 0; i < history.length; i += 2) {
    const turnNum = Math.floor(i / 2) + 1;
    const wMove = history[i];
    const bMove = history[i + 1] || '';
    
    const turnDiv = document.createElement('div');
    turnDiv.className = 'history-turn';
    turnDiv.textContent = `${turnNum}.`;
    
    const wDiv = document.createElement('div');
    wDiv.className = 'history-move';
    wDiv.textContent = wMove;
    
    const bDiv = document.createElement('div');
    bDiv.className = 'history-move';
    bDiv.textContent = bMove;
    
    historyEl.appendChild(turnDiv);
    historyEl.appendChild(wDiv);
    historyEl.appendChild(bDiv);
  }
  historyEl.scrollTop = historyEl.scrollHeight;
}

// Controls
document.getElementById('flip-board-btn').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  btn.classList.add('spinning');
  setTimeout(() => btn.classList.remove('spinning'), 600);
  
  orientation = orientation === 'w' ? 'b' : 'w';
  renderBoard();
});

document.getElementById('reset-board-btn').addEventListener('click', () => {
  chess.reset();
  lastMove = null;
  selectedSquare = null;
  orientation = 'w';
  forwardQueue = [];
  renderBoard();
});

document.getElementById('import-btn')?.addEventListener('click', () => {
  const inputEl = document.getElementById('import-input');
  let val = inputEl.value.trim();
  const rawOriginal = val;
  if (!val) return;

  let success = false;
  
  if (!val.includes('[') && !val.includes('1.')) {
      const parts = val.split(/\s+/);
      if (parts.length === 1) val += ' w KQkq - 0 1';
      else if (parts.length === 2) val += ' KQkq - 0 1';
      else if (parts.length === 3) val += ' - 0 1';
      else if (parts.length === 4) val += ' 0 1';
      else if (parts.length === 5) val += ' 1';
  }

  // Try mapping as FEN first
  if (chess.load(val)) {
    success = true;
  } else {
    // Try mapping as PGN
    if (chess.load_pgn(rawOriginal) || chess.load_pgn(val)) {
      success = true;
    }
  }

  if (success) {
    lastMove = null;
    selectedSquare = null;
    forwardQueue = [];
    
    // Attempt to reconstruct history marker if it was a PGN payload
    const history = chess.history({ verbose: true });
    if (history.length > 0) {
      lastMove = history[history.length - 1];
    }
    
    renderBoard();
    inputEl.value = '';
    inputEl.placeholder = "Loaded Successfully!";
    setTimeout(() => { inputEl.placeholder = "Paste PGN or FEN..."; }, 2500);
  } else {
    inputEl.value = '';
    const oldPh = inputEl.placeholder;
    inputEl.placeholder = "Invalid Format Error";
    setTimeout(() => { inputEl.placeholder = oldPh; }, 2500);
  }
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    const move = chess.undo();
    if (move) {
      forwardQueue.push(move);
      selectedSquare = null;
      lastMove = null;
      
      const history = chess.history({ verbose: true });
      if (history.length > 0) {
        lastMove = history[history.length - 1];
      }
      
      renderBoard();
    }
  } else if (e.key === 'ArrowRight') {
    if (forwardQueue.length > 0) {
      const move = forwardQueue.pop();
      chess.move(move);
      lastMove = move;
      selectedSquare = null;
      renderBoard();
    }
  }
});

// Settings Checkboxes are handled inside renderToggles now

document.getElementById('btn-all-targets')?.addEventListener('click', () => {
    Object.keys(globalTargetToggles).forEach(k => globalTargetToggles[k] = true);
    renderTargetGrid();
    renderBoard();
});

document.getElementById('btn-no-targets')?.addEventListener('click', () => {
    Object.keys(globalTargetToggles).forEach(k => globalTargetToggles[k] = false);
    renderTargetGrid();
    renderBoard();
});

document.getElementById('mode-winning')?.addEventListener('change', (e) => {
    globalModeWinning = e.target.checked;
    renderBoard();
});

document.getElementById('mode-comprehensive')?.addEventListener('change', (e) => {
    globalModeComprehensive = e.target.checked;
    renderBoard();
});

document.getElementById('mode-trivial')?.addEventListener('change', (e) => {
    globalModeTrivial = e.target.checked;
    renderBoard();
});

document.getElementById('mode-skewers')?.addEventListener('change', (e) => {
    globalModeSkewers = e.target.checked;
    renderBoard();
});

document.getElementById('status-indicator')?.addEventListener('click', () => {
    const fen = chess.fen();
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-'; // Disable transient en-passant on forced flip
    
    chess.load(parts.join(' '));
    forwardQueue = [];
    selectedSquare = null;
    lastMove = null;
    renderBoard();
});

// Modal Logic
document.getElementById('info-btn')?.addEventListener('click', () => {
    document.getElementById('info-modal').classList.remove('hidden');
});

document.getElementById('close-modal-btn')?.addEventListener('click', () => {
    document.getElementById('info-modal').classList.add('hidden');
});

document.getElementById('info-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'info-modal') {
        document.getElementById('info-modal').classList.add('hidden');
    }
});

// Init
renderBoard();
