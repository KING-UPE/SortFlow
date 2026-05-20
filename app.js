/**
 * SortFlow — Chunky Modern Sorting Visualizer
 * Core logic, trace engines, and interactive DOM rendering.
 */

// ==========================================================================
// 1. Core State & Constants
// ==========================================================================
let currentTrace = [];       // Array of state snapshots
let currentStepIndex = 0;    // Pointer to current step in playback
let playbackInterval = null; // Interval timer for auto-play
let playbackSpeed = 1000;    // Playback step delay in ms
let originalArray = [];      // Original array before sorting
let activeAlgorithm = 'quick'; // 'quick' | 'merge' | 'heap'

// UI Element Cache
const dom = {
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  arrayInput: document.getElementById('array-input'),
  applyArrayBtn: document.getElementById('apply-array-btn'),
  presetButtons: document.querySelectorAll('[data-preset]'),
  algoTabs: document.querySelectorAll('.algo-tab'),
  narrationText: document.getElementById('narration-text'),
  mainArrayContainer: document.getElementById('main-array-container'),
  mergeShelfContainer: document.getElementById('merge-shelf-container'),
  leftShelfPills: document.getElementById('left-shelf-pills'),
  rightShelfPills: document.getElementById('right-shelf-pills'),
  heapTreeContainer: document.getElementById('heap-tree-container'),
  heapSvg: document.getElementById('heap-svg'),
  btnReset: document.getElementById('btn-reset'),
  btnPrev: document.getElementById('btn-prev'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  btnNext: document.getElementById('btn-next'),
  currentStepCounter: document.getElementById('current-step-counter'),
  totalStepsCounter: document.getElementById('total-steps-counter'),
  timelineSlider: document.getElementById('timeline-slider'),
  timelinePercentage: document.getElementById('timeline-percentage'),
  speedSlider: document.getElementById('speed-slider'),
  speedValue: document.getElementById('speed-value'),
  variablesContainer: document.getElementById('variables-container'),
  codeBoxes: document.querySelectorAll('.code-box')
};

// ==========================================================================
// 2. State-Replay System Helper
// ==========================================================================
class TraceBuilder {
  constructor(initialArray) {
    this.trace = [];
    this.currentArrayState = initialArray.map((val, idx) => ({
      value: val,
      origIdx: idx,
      state: 'normal' // 'normal' | 'compare' | 'swap' | 'pivot' | 'sorted' | 'highlight'
    }));
  }

  // Create deep copy of current array
  cloneArray() {
    return this.currentArrayState.map(item => ({ ...item }));
  }

  // Add a step to the timeline
  pushStep({ lineId, explanation, variables = {}, mergeL = null, mergeR = null, heapSize = null, comparison = null }) {
    this.trace.push({
      array: this.cloneArray(),
      lineId,
      explanation,
      variables: { ...variables },
      mergeL: mergeL ? mergeL.map(x => ({ ...x })) : null,
      mergeR: mergeR ? mergeR.map(x => ({ ...x })) : null,
      heapSize: heapSize,
      comparison: comparison
    });
  }

  // Update specific elements' states
  setStates(indices, state) {
    indices.forEach(idx => {
      if (idx >= 0 && idx < this.currentArrayState.length) {
        this.currentArrayState[idx].state = state;
      }
    });
  }

  // Clear all states back to 'normal' or keep sorted ones
  clearStates(keepSorted = false) {
    this.currentArrayState.forEach(item => {
      if (!keepSorted || item.state !== 'sorted') {
        item.state = 'normal';
      }
    });
  }

  // Swap elements in the array
  swap(idx1, idx2) {
    const temp = this.currentArrayState[idx1];
    this.currentArrayState[idx1] = this.currentArrayState[idx2];
    this.currentArrayState[idx2] = temp;
  }

  // Overwrite value at index
  setValue(idx, value) {
    this.currentArrayState[idx].value = value;
  }
}

// ==========================================================================
// 3. Quick Sort Tracing Engine (Aligns to Image 1)
// ==========================================================================
function generateQuickSortTrace(arr) {
  const tb = new TraceBuilder(arr);
  const A = [...arr]; // Working primitive array

  // Steps recorded in 1-based indexing for textbook alignment
  function qsort(p, r) {
    // Line 1: if p < r
    tb.clearStates(true);
    tb.setStates([p, r], 'highlight');
    tb.pushStep({
      lineId: 'q-1',
      explanation: `We check if the sub-array has more than 1 element. Index p = ${p + 1} and r = ${r + 1} (${p + 1} < ${r + 1} is ${p < r}).`,
      variables: { p: p + 1, r: r + 1 },
      comparison: {
        expression: `${p + 1} < ${r + 1}`,
        result: p < r
      }
    });

    if (p < r) {
      // Line 2: q <- PARTITION(A, p, r)
      tb.clearStates(true);
      tb.pushStep({
        lineId: 'q-2',
        explanation: `We call PARTITION(A, ${p + 1}, ${r + 1}) to place a pivot in its correct position.`,
        variables: { p: p + 1, r: r + 1 }
      });

      const q = partition(p, r);

      // Line 3: QUICKSORT(A, p, q - 1)
      tb.clearStates(true);
      tb.setStates([q], 'sorted');
      tb.pushStep({
        lineId: 'q-3',
        explanation: `Recursively sort the left section: A[${p + 1}..${q}].`,
        variables: { p: p + 1, r: r + 1, q: q + 1 }
      });
      qsort(p, q - 1);

      // Line 4: QUICKSORT(A, q + 1, r)
      tb.clearStates(true);
      tb.setStates([q], 'sorted');
      tb.pushStep({
        lineId: 'q-4',
        explanation: `Recursively sort the right section: A[${q + 2}..${r + 1}].`,
        variables: { p: p + 1, r: r + 1, q: q + 1 }
      });
      qsort(q + 1, r);
    } else {
      // Single element is sorted by definition
      if (p === r) {
        tb.clearStates(true);
        tb.setStates([p], 'sorted');
        tb.pushStep({
          lineId: 'q-1',
          explanation: `Sub-array of size 1 at index ${p + 1} is already sorted.`,
          variables: { p: p + 1, r: r + 1 },
          comparison: {
            expression: `${p + 1} < ${r + 1}`,
            result: false
          }
        });
      }
    }
  }

  function partition(p, r) {
    // Line 1: x <- A[r]
    const x = A[r];
    tb.clearStates(true);
    tb.setStates([r], 'pivot');
    tb.pushStep({
      lineId: 'p-1',
      explanation: `We select the last element of our sub-array, A[${r + 1}] = ${x}, as our pivot 'x'. We will arrange items around it.`,
      variables: { p: p + 1, r: r + 1, x, i: 'p - 1' }
    });

    // Line 2: i <- p - 1
    let i = p - 1;
    tb.pushStep({
      lineId: 'p-2',
      explanation: `Initialize index 'i' to ${i + 1} (one index left of p). Everything at or left of 'i' is ≤ pivot ${x}.`,
      variables: { p: p + 1, r: r + 1, x, i: i + 1 }
    });

    // Line 3: for j <- p to r - 1
    for (let j = p; j <= r - 1; j++) {
      tb.clearStates(true);
      tb.setStates([r], 'pivot');
      tb.setStates([j], 'compare');
      if (i >= p) tb.setStates([i], 'highlight');
      tb.pushStep({
        lineId: 'p-3',
        explanation: `Loop index 'j' moves to ${j + 1}. We inspect A[${j + 1}] (${A[j]}).`,
        variables: { p: p + 1, r: r + 1, x, i: i + 1, j: j + 1 }
      });

      // Line 4: do if A[j] <= x
      tb.pushStep({
        lineId: 'p-4',
        explanation: `Compare A[${j + 1}] (${A[j]}) with pivot x (${x}): Is ${A[j]} ≤ ${x}?`,
        variables: { p: p + 1, r: r + 1, x, i: i + 1, j: j + 1, comparison: `${A[j]} ≤ ${x}` },
        comparison: {
          expression: `${A[j]} ≤ ${x}`,
          result: A[j] <= x
        }
      });

      if (A[j] <= x) {
        // Line 5: then i <- i + 1
        i++;
        tb.clearStates(true);
        tb.setStates([r], 'pivot');
        tb.setStates([j], 'compare');
        tb.setStates([i], 'highlight');
        tb.pushStep({
          lineId: 'p-5',
          explanation: `Since ${A[j]} ≤ ${x}, we increment index 'i' to ${i + 1} to grow our 'smaller elements' section.`,
          variables: { p: p + 1, r: r + 1, x, i: i + 1, j: j + 1 }
        });

        // Line 6: exchange A[i] <-> A[j]
        const temp = A[i];
        A[i] = A[j];
        A[j] = temp;

        tb.swap(i, j);
        tb.clearStates(true);
        tb.setStates([r], 'pivot');
        tb.setStates([i, j], 'swap');
        tb.pushStep({
          lineId: 'p-6',
          explanation: `Exchange A[${i + 1}] (${A[i]}) ↔ A[${j + 1}] (${A[j]}). This places the smaller element behind the 'i' boundary.`,
          variables: { p: p + 1, r: r + 1, x, i: i + 1, j: j + 1 }
        });
      }
    }

    // Line 7: exchange A[i + 1] <-> A[r]
    const temp = A[i + 1];
    A[i + 1] = A[r];
    A[r] = temp;

    tb.swap(i + 1, r);
    tb.clearStates(true);
    tb.setStates([i + 1, r], 'swap');
    tb.pushStep({
      lineId: 'p-7',
      explanation: `All elements processed. Move the pivot to its final sorted place by swapping A[${i + 2}] (${A[i + 1]}) ↔ A[${r + 1}] (${A[r]}).`,
      variables: { p: p + 1, r: r + 1, x, i: i + 1 }
    });

    // Line 8: return i + 1
    const q = i + 1;
    tb.clearStates(true);
    tb.setStates([q], 'sorted');
    tb.pushStep({
      lineId: 'p-8',
      explanation: `Return the final pivot index q = ${q + 1}. The pivot value ${A[q]} is now in its permanent sorted spot.`,
      variables: { p: p + 1, r: r + 1, q: q + 1 }
    });

    return q;
  }

  qsort(0, A.length - 1);

  // Mark everything as sorted in the final step
  tb.clearStates();
  tb.setStates(arr.keys(), 'sorted');
  tb.pushStep({
    lineId: null,
    explanation: "Quick Sort is fully complete! The entire array is sorted.",
    variables: {}
  });

  return tb.trace;
}

// ==========================================================================
// 4. Merge Sort Tracing Engine (Aligns to Image 2)
// ==========================================================================
function generateMergeSortTrace(arr) {
  const tb = new TraceBuilder(arr);
  const A = [...arr]; // Working primitive array

  function mergeSort(p, r) {
    // Line 1: if p < r
    tb.clearStates(true);
    tb.setStates([p, r], 'highlight');
    tb.pushStep({
      lineId: 'ms-1',
      explanation: `We check if the sub-array has more than 1 element. Index p = ${p + 1} and r = ${r + 1} (${p + 1} < ${r + 1} is ${p < r}).`,
      variables: { p: p + 1, r: r + 1 },
      comparison: {
        expression: `${p + 1} < ${r + 1}`,
        result: p < r
      }
    });

    if (p < r) {
      // Line 2: q <- floor((p + r) / 2)
      const q = Math.floor((p + r) / 2);
      tb.clearStates(true);
      tb.setStates([p, q, r], 'highlight');
      tb.pushStep({
        lineId: 'ms-2',
        explanation: `Calculate middle index: q = ⌊(${p + 1} + ${r + 1}) / 2⌋ = ${q + 1}.`,
        variables: { p: p + 1, r: r + 1, q: q + 1 }
      });

      // Line 3: MERGESORT(A, p, q)
      tb.clearStates(true);
      tb.pushStep({
        lineId: 'ms-3',
        explanation: `Recursively sort the left sub-array A[${p + 1}..${q + 1}].`,
        variables: { p: p + 1, r: r + 1, q: q + 1 }
      });
      mergeSort(p, q);

      // Line 4: MERGESORT(A, q + 1, r)
      tb.clearStates(true);
      tb.pushStep({
        lineId: 'ms-4',
        explanation: `Recursively sort the right sub-array A[${q + 2}..${r + 1}].`,
        variables: { p: p + 1, r: r + 1, q: q + 1 }
      });
      mergeSort(q + 1, r);

      // Line 5: MERGE(A, p, q, r)
      tb.clearStates(true);
      tb.setStates(Array.from({ length: r - p + 1 }, (_, i) => p + i), 'highlight');
      tb.pushStep({
        lineId: 'ms-5',
        explanation: `Merge the two sorted halves A[${p + 1}..${q + 1}] and A[${q + 2}..${r + 1}] back together in sorted order.`,
        variables: { p: p + 1, q: q + 1, r: r + 1 }
      });
      merge(p, q, r);
    }
  }

  function merge(p, q, r) {
    // Line 1: n1 <- q - p + 1
    const n1 = q - p + 1;
    tb.pushStep({
      lineId: 'm-1',
      explanation: `Calculate size of left half: n₁ = ${q + 1} - ${p + 1} + 1 = ${n1}.`,
      variables: { p: p + 1, q: q + 1, r: r + 1, n1 }
    });

    // Line 2: n2 <- r - q
    const n2 = r - q;
    tb.pushStep({
      lineId: 'm-2',
      explanation: `Calculate size of right half: n₂ = ${r + 1} - ${q + 1} = ${n2}.`,
      variables: { p: p + 1, q: q + 1, r: r + 1, n1, n2 }
    });

    // Line 3: create arrays L[1..n1+1] and R[1..n2+1]
    const L = [];
    const R = [];
    let mergeL = [];
    let mergeR = [];
    tb.pushStep({
      lineId: 'm-3',
      explanation: `Allocate two temporary arrays L (size ${n1 + 1}) and R (size ${n2 + 1}) to hold copy of values.`,
      variables: { p: p + 1, q: q + 1, r: r + 1, n1, n2 },
      mergeL,
      mergeR
    });

    // Line 4 & 5: for i <- 1 to n1 do L[i] <- A[p + i - 1]
    for (let i = 1; i <= n1; i++) {
      const idxInA = p + i - 1;
      L[i] = A[idxInA];
      
      tb.clearStates(true);
      tb.setStates([idxInA], 'compare');
      mergeL.push({ value: L[i], state: 'highlight' });

      tb.pushStep({
        lineId: 'm-5',
        explanation: `Copy A[${idxInA + 1}] (${A[idxInA]}) into temporary array L[${i}].`,
        variables: { p: p + 1, q: q + 1, r: r + 1, n1, n2, i },
        mergeL,
        mergeR
      });
      mergeL[i - 1].state = 'normal';
    }

    // Line 6 & 7: for j <- 1 to n2 do R[j] <- A[q + j]
    for (let j = 1; j <= n2; j++) {
      const idxInA = q + j;
      R[j] = A[idxInA];

      tb.clearStates(true);
      tb.setStates([idxInA], 'compare');
      mergeR.push({ value: R[j], state: 'highlight' });

      tb.pushStep({
        lineId: 'm-7',
        explanation: `Copy A[${idxInA + 1}] (${A[idxInA]}) into temporary array R[${j}].`,
        variables: { p: p + 1, q: q + 1, r: r + 1, n1, n2, j },
        mergeL,
        mergeR
      });
      mergeR[j - 1].state = 'normal';
    }

    // Line 8: L[n1 + 1] <- infinity
    L[n1 + 1] = Infinity;
    mergeL.push({ value: '∞', state: 'highlight' });
    tb.clearStates(true);
    tb.pushStep({
      lineId: 'm-8',
      explanation: `Set guard sentinel L[${n1 + 1}] = ∞ to simplify comparisons without bounds checking.`,
      variables: { p: p + 1, q: q + 1, r: r + 1 },
      mergeL,
      mergeR
    });
    mergeL[n1].state = 'normal';

    // Line 9: R[n2 + 1] <- infinity
    R[n2 + 1] = Infinity;
    mergeR.push({ value: '∞', state: 'highlight' });
    tb.clearStates(true);
    tb.pushStep({
      lineId: 'm-9',
      explanation: `Set guard sentinel R[${n2 + 1}] = ∞ to simplify comparisons without bounds checking.`,
      variables: { p: p + 1, q: q + 1, r: r + 1 },
      mergeL,
      mergeR
    });
    mergeR[n2].state = 'normal';

    // Line 10: i <- 1
    let i = 1;
    tb.pushStep({
      lineId: 'm-10',
      explanation: `Initialize index 'i' to 1 to scan temporary left shelf.`,
      variables: { p: p + 1, q: q + 1, r: r + 1, i, j: 1 },
      mergeL,
      mergeR
    });

    // Line 11: j <- 1
    let j = 1;
    tb.pushStep({
      lineId: 'm-11',
      explanation: `Initialize index 'j' to 1 to scan temporary right shelf.`,
      variables: { p: p + 1, q: q + 1, r: r + 1, i, j },
      mergeL,
      mergeR
    });

    // Line 12: for k <- p to r
    for (let k = p; k <= r; k++) {
      tb.clearStates(true);
      tb.setStates([k], 'highlight');

      // Highlight active L/R comparison visually
      mergeL.forEach((x, idx) => x.state = idx === (i - 1) ? 'compare' : 'normal');
      mergeR.forEach((x, idx) => x.state = idx === (j - 1) ? 'compare' : 'normal');

      tb.pushStep({
        lineId: 'm-12',
        explanation: `Scanning slot k = ${k + 1} in main array A. Compare front shelf elements.`,
        variables: { p: p + 1, q: q + 1, r: r + 1, i, j, k: k + 1 },
        mergeL,
        mergeR
      });

      // Line 13: do if L[i] <= R[j]
      const valL = L[i] === Infinity ? '∞' : L[i];
      const valR = R[j] === Infinity ? '∞' : R[j];
      tb.pushStep({
        lineId: 'm-13',
        explanation: `Compare: Is L[${i}] (${valL}) ≤ R[${j}] (${valR})?`,
        variables: { p: p + 1, q: q + 1, r: r + 1, i, j, k: k + 1 },
        mergeL,
        mergeR,
        comparison: {
          expression: `${valL} ≤ ${valR}`,
          result: L[i] <= R[j]
        }
      });

      if (L[i] <= R[j]) {
        // Line 14: then A[k] <- L[i]
        A[k] = L[i];
        tb.setValue(k, L[i]);
        tb.clearStates(true);
        tb.setStates([k], 'swap');
        mergeL[i - 1].state = 'sorted';

        tb.pushStep({
          lineId: 'm-14',
          explanation: `Yes! Place L[${i}] (${L[i]}) into main array slot A[${k + 1}].`,
          variables: { p: p + 1, q: q + 1, r: r + 1, i, j, k: k + 1 },
          mergeL,
          mergeR
        });

        // Line 15: i <- i + 1
        i++;
        tb.pushStep({
          lineId: 'm-15',
          explanation: `Move index 'i' to ${i} on the left shelf.`,
          variables: { p: p + 1, q: q + 1, r: r + 1, i, j, k: k + 1 },
          mergeL,
          mergeR
        });
      } else {
        // Line 16: else A[k] <- R[j]
        A[k] = R[j];
        tb.setValue(k, R[j]);
        tb.clearStates(true);
        tb.setStates([k], 'swap');
        mergeR[j - 1].state = 'sorted';

        tb.pushStep({
          lineId: 'm-16',
          explanation: `No! R[${j}] (${R[j]}) is smaller. Place R[${j}] into main array slot A[${k + 1}].`,
          variables: { p: p + 1, q: q + 1, r: r + 1, i, j, k: k + 1 },
          mergeL,
          mergeR
        });

        // Line 17: j <- j + 1
        j++;
        tb.pushStep({
          lineId: 'm-17',
          explanation: `Move index 'j' to ${j} on the right shelf.`,
          variables: { p: p + 1, q: q + 1, r: r + 1, i, j, k: k + 1 },
          mergeL,
          mergeR
        });
      }
    }

    // Clean shelf highlights
    tb.clearStates(true);
    tb.setStates(Array.from({ length: r - p + 1 }, (_, i) => p + i), 'sorted');
    tb.pushStep({
      lineId: null,
      explanation: `Sub-array section A[${p + 1}..${r + 1}] is merged successfully in sorted order.`,
      variables: { p: p + 1, r: r + 1 }
    });
  }

  mergeSort(0, A.length - 1);

  // Mark all sorted in the final step
  tb.clearStates();
  tb.setStates(arr.keys(), 'sorted');
  tb.pushStep({
    lineId: null,
    explanation: "Merge Sort is fully complete! The entire array is sorted.",
    variables: {}
  });

  return tb.trace;
}

// ==========================================================================
// 5. Heap Sort Tracing Engine (Aligns to Image 3)
// ==========================================================================
function generateHeapSortTrace(arr) {
  const tb = new TraceBuilder(arr);
  const A = [...arr]; // Working primitive array
  let heapSize = A.length;

  // Index helper mappings: Textbook pseudo-code is 1-based.
  // 1-based root = 1 -> JS index = 0
  // Left Child of i (1-based) = 2*i -> JS index = 2*i - 1
  // Right Child of i (1-based) = 2*i + 1 -> JS index = 2*i

  function leftChild(i) { return 2 * i; }
  function rightChild(i) { return 2 * i + 1; }

  function heapify(i) {
    // Line 1: l <- LEFT_CHILD(i)
    const l = leftChild(i);
    // Line 2: r <- RIGHT_CHILD(i)
    const r = rightChild(i);

    tb.clearStates();
    tb.setStates([i - 1], 'compare');
    if (l <= heapSize) tb.setStates([l - 1], 'highlight');
    if (r <= heapSize) tb.setStates([r - 1], 'highlight');
    // Elements past heapSize are permanently sorted
    for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

    tb.pushStep({
      lineId: 'h-1',
      explanation: `Compute child nodes of node A[${i}] (${A[i - 1]}): Left child index l = ${l}, Right child index r = ${r}.`,
      variables: { i, l, r, heap_size: heapSize },
      heapSize
    });

    // Line 3 & 4 & 5: if l <= heap_size and A[l] > A[i] then largest <- l else largest <- i
    let largest = i;
    let comparisonL = false;

    if (l <= heapSize) {
      comparisonL = A[l - 1] > A[i - 1];
      tb.clearStates();
      tb.setStates([i - 1, l - 1], 'compare');
      for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

      tb.pushStep({
        lineId: 'h-3',
        explanation: `Compare Left child A[${l}] (${A[l - 1]}) with Parent A[${i}] (${A[i - 1]}): Is ${A[l - 1]} > ${A[i - 1]}?`,
        variables: { i, l, r, largest, heap_size: heapSize },
        heapSize,
        comparison: {
          expression: `${A[l - 1]} > ${A[i - 1]}`,
          result: comparisonL
        }
      });
    } else {
      tb.pushStep({
        lineId: 'h-3',
        explanation: `Left child index l = ${l} is outside the active heap bounds (heap_size = ${heapSize}).`,
        variables: { i, l, r, largest, heap_size: heapSize },
        heapSize,
        comparison: {
          expression: `${l} ≤ ${heapSize}`,
          result: false
        }
      });
    }

    if (l <= heapSize && comparisonL) {
      largest = l;
      tb.pushStep({
        lineId: 'h-4',
        explanation: `Yes, Left child A[${l}] is larger. Set largest ← ${l}.`,
        variables: { i, l, r, largest, heap_size: heapSize },
        heapSize
      });
    } else {
      tb.pushStep({
        lineId: 'h-5',
        explanation: `Parent A[${i}] is larger than left child or left child does not exist. Keep largest ← ${i}.`,
        variables: { i, l, r, largest, heap_size: heapSize },
        heapSize
      });
    }

    // Line 6 & 7: if r <= heap_size and A[r] > A[largest] then largest <- r
    if (r <= heapSize) {
      tb.clearStates();
      tb.setStates([largest - 1, r - 1], 'compare');
      for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

      const comparisonR = A[r - 1] > A[largest - 1];
      tb.pushStep({
        lineId: 'h-6',
        explanation: `Compare Right child A[${r}] (${A[r - 1]}) with current largest A[${largest}] (${A[largest - 1]}): Is ${A[r - 1]} > ${A[largest - 1]}?`,
        variables: { i, l, r, largest, heap_size: heapSize },
        heapSize,
        comparison: {
          expression: `${A[r - 1]} > ${A[largest - 1]}`,
          result: comparisonR
        }
      });

      if (A[r - 1] > A[largest - 1]) {
        largest = r;
        tb.pushStep({
          lineId: 'h-7',
          explanation: `Yes! Right child A[${r}] (${A[r - 1]}) is the largest. Update largest ← ${r}.`,
          variables: { i, l, r, largest, heap_size: heapSize },
          heapSize
        });
      }
    }

    // Line 8: if largest != i
    tb.clearStates();
    tb.setStates([i - 1, largest - 1], 'highlight');
    for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');
    tb.pushStep({
      lineId: 'h-8',
      explanation: `Check if heap property is violated: Is largest index (${largest}) ≠ parent index (${i})?`,
      variables: { i, largest, heap_size: heapSize },
      heapSize,
      comparison: {
        expression: `${largest} ≠ ${i}`,
        result: largest !== i
      }
    });

    if (largest !== i) {
      // Line 9: exchange A[i] <-> A[largest]
      const temp = A[i - 1];
      A[i - 1] = A[largest - 1];
      A[largest - 1] = temp;

      tb.swap(i - 1, largest - 1);
      tb.clearStates();
      tb.setStates([i - 1, largest - 1], 'swap');
      for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

      tb.pushStep({
        lineId: 'h-9',
        explanation: `Swap parent A[${i}] (${A[i - 1]}) ↔ largest child A[${largest}] (${A[largest - 1]}) to restore local max-heap order.`,
        variables: { i, largest, heap_size: heapSize },
        heapSize
      });

      // Line 10: HEAPIFY(A, largest)
      tb.pushStep({
        lineId: 'h-10',
        explanation: `Sinking child element down. Recursively call HEAPIFY on index ${largest}.`,
        variables: { i: largest, heap_size: heapSize },
        heapSize
      });
      heapify(largest);
    }
  }

  function buildHeap() {
    // Line 1: heap_size[A] <- length[A]
    heapSize = A.length;
    tb.pushStep({
      lineId: 'bh-1',
      explanation: `Initialize heap_size[A] to full length of array (${heapSize}). All elements are part of the active heap tree.`,
      variables: { heap_size: heapSize },
      heapSize
    });

    // Line 2: for i <- floor(length[A]/2) downto 1
    const startIdx = Math.floor(A.length / 2);
    for (let i = startIdx; i >= 1; i--) {
      tb.clearStates();
      tb.setStates([i - 1], 'highlight');
      tb.pushStep({
        lineId: 'bh-2',
        explanation: `Loop down non-leaf parent nodes: i = ⌊${A.length}/2⌋ downto 1. Call HEAPIFY on index i = ${i}.`,
        variables: { i, heap_size: heapSize },
        heapSize
      });

      // Line 3: HEAPIFY(A, i)
      heapify(i);
    }
  }

  // Procedure HEAPSORT(A)
  // Line 1: BUILD_HEAP[A]
  tb.pushStep({
    lineId: 'hs-1',
    explanation: `Step 1: Construct a Max-Heap out of the elements. This guarantees the maximum value resides at the root index 1.`,
    variables: { heap_size: heapSize },
    heapSize
  });
  buildHeap();

  // Line 2: for i <- length[A] down to 2
  for (let i = A.length; i >= 2; i--) {
    tb.clearStates();
    tb.setStates([0, i - 1], 'highlight');
    for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

    tb.pushStep({
      lineId: 'hs-2',
      explanation: `We loop index i from ${i} down to 2. We extract the maximum element currently at the root.`,
      variables: { i, heap_size: heapSize },
      heapSize
    });

    // Line 3: Exchange A[1] <-> A[i]
    const temp = A[0];
    A[0] = A[i - 1];
    A[i - 1] = temp;

    tb.swap(0, i - 1);
    tb.clearStates();
    tb.setStates([0, i - 1], 'swap');
    for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

    tb.pushStep({
      lineId: 'hs-3',
      explanation: `Exchange root A[1] (${A[0]}) ↔ last unsorted element A[${i}] (${A[i - 1]}). The largest value ${A[i - 1]} is now in place.`,
      variables: { i, heap_size: heapSize },
      heapSize
    });

    // Line 4: heap_size[A] <- heap_size[A] - 1
    heapSize--;
    tb.clearStates();
    tb.setStates([i - 1], 'sorted');
    for (let k = heapSize + 1; k < A.length; k++) tb.setStates([k], 'sorted');

    tb.pushStep({
      lineId: 'hs-4',
      explanation: `Decrease active heap_size[A] to ${heapSize}. Elements from index ${heapSize + 1} onwards are locked and sorted!`,
      variables: { i, heap_size: heapSize },
      heapSize
    });

    // Line 5: HEAPIFY(A, 1)
    tb.clearStates();
    tb.setStates([0], 'compare');
    for (let k = heapSize; k < A.length; k++) tb.setStates([k], 'sorted');

    tb.pushStep({
      lineId: 'hs-5',
      explanation: `Call HEAPIFY(A, 1) on root node to pull the next largest element to the top.`,
      variables: { i, heap_size: heapSize },
      heapSize
    });
    heapify(1);
  }

  // Mark all sorted in the final step
  tb.clearStates();
  tb.setStates(arr.keys(), 'sorted');
  tb.pushStep({
    lineId: null,
    explanation: "Heap Sort is fully complete! The entire array is sorted.",
    variables: {},
    heapSize: 0
  });

  return tb.trace;
}

// ==========================================================================
// 6. Visual DOM Renderers
// ==========================================================================

// Renders the main capsule pills
function renderArrayPills(arrayState) {
  dom.mainArrayContainer.innerHTML = '';
  arrayState.forEach((item, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pill-wrapper';

    const pill = document.createElement('div');
    pill.className = `pill state-${item.state}`;
    pill.textContent = item.value;

    const indexBadge = document.createElement('span');
    indexBadge.className = 'pill-index';
    indexBadge.textContent = idx + 1; // Align index 1-based with pseudo-code

    wrapper.appendChild(pill);
    wrapper.appendChild(indexBadge);
    dom.mainArrayContainer.appendChild(wrapper);
  });
}

// Renders Merge Sort side shelves
function renderMergeShelves(mergeL, mergeR) {
  if (!mergeL && !mergeR) {
    dom.mergeShelfContainer.classList.add('hidden');
    return;
  }
  dom.mergeShelfContainer.classList.remove('hidden');

  // Left Sub-shelf
  dom.leftShelfPills.innerHTML = '';
  if (mergeL && mergeL.length > 0) {
    mergeL.forEach((item, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'pill-wrapper';

      const pill = document.createElement('div');
      pill.className = `pill state-${item.state}`;
      pill.textContent = item.value;

      const idxLabel = document.createElement('span');
      idxLabel.className = 'pill-index';
      idxLabel.textContent = `L[${idx + 1}]`;

      wrapper.appendChild(pill);
      wrapper.appendChild(idxLabel);
      dom.leftShelfPills.appendChild(wrapper);
    });
  } else {
    dom.leftShelfPills.innerHTML = '<span class="no-vars-msg">Empty</span>';
  }

  // Right Sub-shelf
  dom.rightShelfPills.innerHTML = '';
  if (mergeR && mergeR.length > 0) {
    mergeR.forEach((item, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'pill-wrapper';

      const pill = document.createElement('div');
      pill.className = `pill state-${item.state}`;
      pill.textContent = item.value;

      const idxLabel = document.createElement('span');
      idxLabel.className = 'pill-index';
      idxLabel.textContent = `R[${idx + 1}]`;

      wrapper.appendChild(pill);
      wrapper.appendChild(idxLabel);
      dom.rightShelfPills.appendChild(wrapper);
    });
  } else {
    dom.rightShelfPills.innerHTML = '<span class="no-vars-msg">Empty</span>';
  }
}

// Renders Heap Sort interactive SVG tree
function renderHeapTree(arrayState, heapSize) {
  if (heapSize === null) {
    dom.heapTreeContainer.classList.add('hidden');
    return;
  }
  dom.heapTreeContainer.classList.remove('hidden');

  const N = arrayState.length;
  const svg = dom.heapSvg;
  svg.innerHTML = ''; // Reset SVG contents

  // Pre-calculate positions for N elements dynamically (assuming full heap layout layout)
  // Max width of SVG is 500, max height is 240
  const width = svg.clientWidth || 500;
  const coords = [];
  
  // Levels: root is lvl 0, children at lvl 1, 2, 3
  const ySpacing = 60;
  const topOffset = 30;

  for (let idx = 0; idx < N; idx++) {
    const level = Math.floor(Math.log2(idx + 1));
    const nodesInLevel = Math.pow(2, level);
    const indexInLevel = idx - nodesInLevel + 1;
    const xSpacing = width / (nodesInLevel + 1);

    coords[idx] = {
      x: xSpacing * (indexInLevel + 1),
      y: topOffset + level * ySpacing
    };
  }

  // Step 1: Draw connected lines (parent to children)
  for (let idx = 0; idx < N; idx++) {
    const lIdx = 2 * (idx + 1) - 1; // Left child index
    const rIdx = 2 * (idx + 1);     // Right child index

    if (lIdx < N) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', coords[idx].x);
      line.setAttribute('y1', coords[idx].y);
      line.setAttribute('x2', coords[lIdx].x);
      line.setAttribute('y2', coords[lIdx].y);
      line.setAttribute('class', 'node-link');

      // Highlight active child connection during traversal
      const leftIsInActiveHeap = (lIdx + 1) <= heapSize;
      const isParentActive = arrayState[idx].state !== 'normal' && arrayState[idx].state !== 'sorted';
      
      if (!leftIsInActiveHeap) {
        line.setAttribute('stroke', 'var(--border-color)');
        line.setAttribute('stroke-dasharray', '4,4');
      } else if (isParentActive && (arrayState[lIdx].state === 'compare' || arrayState[lIdx].state === 'swap')) {
        line.setAttribute('stroke', 'var(--accent-color)');
      } else {
        line.setAttribute('stroke', 'var(--border-color)');
      }
      svg.appendChild(line);
    }

    if (rIdx < N) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', coords[idx].x);
      line.setAttribute('y1', coords[idx].y);
      line.setAttribute('x2', coords[rIdx].x);
      line.setAttribute('y2', coords[rIdx].y);
      line.setAttribute('class', 'node-link');

      const rightIsInActiveHeap = (rIdx + 1) <= heapSize;
      const isParentActive = arrayState[idx].state !== 'normal' && arrayState[idx].state !== 'sorted';

      if (!rightIsInActiveHeap) {
        line.setAttribute('stroke', 'var(--border-color)');
        line.setAttribute('stroke-dasharray', '4,4');
      } else if (isParentActive && (arrayState[rIdx].state === 'compare' || arrayState[rIdx].state === 'swap')) {
        line.setAttribute('stroke', 'var(--accent-color)');
      } else {
        line.setAttribute('stroke', 'var(--border-color)');
      }
      svg.appendChild(line);
    }
  }

  // Step 2: Draw node circles & text labels
  for (let idx = 0; idx < N; idx++) {
    const item = arrayState[idx];
    const isSorted = (idx + 1) > heapSize;
    const isChild = (idx + 1) <= heapSize;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node-group');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coords[idx].x);
    circle.setAttribute('cy', coords[idx].y);
    circle.setAttribute('r', 18);
    circle.setAttribute('class', 'node-circle');

    // Color-code the tree nodes dynamically to match the capsules
    let fill = 'var(--bg-secondary)';
    let stroke = 'var(--border-color)';
    let textFill = 'var(--text-primary)';

    if (isSorted) {
      fill = 'var(--pill-sorted)';
      stroke = '#22c55e';
      textFill = 'var(--pill-sorted-text)';
    } else if (item.state === 'compare') {
      fill = 'var(--pill-compare)';
      stroke = '#eab308';
      textFill = 'var(--pill-compare-text)';
    } else if (item.state === 'swap') {
      fill = 'var(--pill-swap)';
      stroke = '#ef4444';
      textFill = 'var(--pill-swap-text)';
    } else if (item.state === 'highlight') {
      fill = 'var(--pill-highlight)';
      stroke = '#3b82f6';
      textFill = 'var(--pill-highlight-text)';
    } else {
      fill = 'var(--pill-normal)';
      stroke = 'var(--border-color)';
      textFill = 'var(--pill-normal-text)';
    }

    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', stroke);
    g.appendChild(circle);

    // Value text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', coords[idx].x);
    text.setAttribute('y', coords[idx].y);
    text.setAttribute('class', 'node-text');
    text.setAttribute('fill', textFill);
    text.textContent = item.value;
    g.appendChild(text);

    // Index label badge above/below node
    const indexText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    indexText.setAttribute('x', coords[idx].x);
    indexText.setAttribute('y', coords[idx].y + 26);
    indexText.setAttribute('class', 'node-index');
    indexText.setAttribute('fill', 'var(--text-secondary)');
    indexText.textContent = idx + 1;
    g.appendChild(indexText);

    svg.appendChild(g);
  }
}

// Renders the live variable cards
function renderVariables(variables) {
  dom.variablesContainer.innerHTML = '';
  const keys = Object.keys(variables);
  if (keys.length === 0) {
    dom.variablesContainer.innerHTML = '<div class="no-vars-msg">No active variables in this step.</div>';
    return;
  }

  keys.forEach(key => {
    // Skip internal helper state comparisons
    if (key === 'comparison') return;

    const card = document.createElement('div');
    card.className = 'variable-card';

    const name = document.createElement('span');
    name.className = 'var-name';
    name.textContent = key;

    const value = document.createElement('span');
    value.className = 'var-value';
    value.textContent = variables[key];

    card.appendChild(name);
    card.appendChild(value);
    dom.variablesContainer.appendChild(card);
  });
}

// Highlights the active pseudo-code line
function renderCodeHighlight(lineId, comparison = null) {
  // Clear all running lines and existing comparison badges
  document.querySelectorAll('.code-line').forEach(line => {
    line.classList.remove('line-running');
    const oldBadge = line.querySelector('.comparison-badge');
    if (oldBadge) oldBadge.remove();
  });

  if (!lineId) return;

  const targetLine = document.querySelector(`[data-line="${lineId}"]`);
  if (targetLine) {
    targetLine.classList.add('line-running');
    
    // Inject the boolean comparison badge dynamically
    if (comparison && comparison.expression) {
      const badge = document.createElement('span');
      badge.className = `comparison-badge ${comparison.result ? 'eval-true' : 'eval-false'}`;
      badge.innerHTML = `${comparison.expression} ➔ ${comparison.result ? 'True' : 'False'}`;
      targetLine.appendChild(badge);
    }
    
    // Scroll pseudo-code box to keep active line visible if long
    targetLine.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Renders complete frame/step state
function renderStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= currentTrace.length) return;

  const step = currentTrace[stepIndex];

  // Array elements
  renderArrayPills(step.array);

  // Sub-views
  renderMergeShelves(step.mergeL, step.mergeR);
  renderHeapTree(step.array, step.heapSize);

  // Narration & variables
  dom.narrationText.textContent = step.explanation;
  renderVariables(step.variables);

  // Pseudo-code stepper
  renderCodeHighlight(step.lineId, step.comparison);

  // Progress controllers update
  dom.currentStepCounter.textContent = stepIndex;
  dom.timelineSlider.value = stepIndex;

  const totalSteps = currentTrace.length - 1;
  const percent = totalSteps > 0 ? Math.round((stepIndex / totalSteps) * 100) : 0;
  dom.timelinePercentage.textContent = `${percent}%`;
}

// ==========================================================================
// 7. Interactive Playback Loops
// ==========================================================================
function startPlayback() {
  if (playbackInterval) return;

  // Change visual of play icon to pause
  dom.btnPlayPause.innerHTML = '⏸️';
  dom.btnPlayPause.className = 'btn-icon btn-play active';

  playbackInterval = setInterval(() => {
    if (currentStepIndex >= currentTrace.length - 1) {
      pausePlayback();
      return;
    }
    currentStepIndex++;
    renderStep(currentStepIndex);
  }, playbackSpeed);
}

function pausePlayback() {
  if (!playbackInterval) return;

  clearInterval(playbackInterval);
  playbackInterval = null;

  dom.btnPlayPause.innerHTML = '<span class="play-icon">▶️</span>';
  dom.btnPlayPause.className = 'btn-icon btn-play';
}

function stepForward() {
  pausePlayback();
  if (currentStepIndex < currentTrace.length - 1) {
    currentStepIndex++;
    renderStep(currentStepIndex);
  }
}

function stepBackward() {
  pausePlayback();
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderStep(currentStepIndex);
  }
}

function resetPlayback() {
  pausePlayback();
  currentStepIndex = 0;
  renderStep(currentStepIndex);
}

function changeSpeed(sliderValue) {
  // slider values 1 to 10 -> maps 1500ms down to 100ms
  // exponential mapping makes speed changes feel smoother
  const factor = (11 - sliderValue) / 10;
  playbackSpeed = 100 + Math.pow(factor, 2) * 1400;

  // Display speeds (e.g. 1.0x, 2.5x)
  const multiplier = (1 / factor).toFixed(1);
  dom.speedValue.textContent = `${multiplier}x`;

  // Restart playback with new speed if currently playing
  if (playbackInterval) {
    pausePlayback();
    startPlayback();
  }
}

// ==========================================================================
// 8. Array Tracing Setup & Trigger
// ==========================================================================
function loadAlgorithmTrace(arr, algo) {
  pausePlayback();
  originalArray = [...arr];

  if (algo === 'quick') {
    currentTrace = generateQuickSortTrace(originalArray);
  } else if (algo === 'merge') {
    currentTrace = generateMergeSortTrace(originalArray);
  } else if (algo === 'heap') {
    currentTrace = generateHeapSortTrace(originalArray);
  }

  currentStepIndex = 0;

  // Update controllers constraints
  const maxStepIdx = currentTrace.length - 1;
  dom.totalStepsCounter.textContent = maxStepIdx;
  dom.timelineSlider.max = maxStepIdx;
  dom.timelineSlider.value = 0;

  // Initial step render
  renderStep(currentStepIndex);
}

// Parses string arrays safely
function parseCustomArray(inputStr) {
  const cleanStr = inputStr.replace(/[^0-9,\s]/g, '');
  const arr = cleanStr.split(',')
                      .map(x => parseInt(x.trim(), 10))
                      .filter(x => !isNaN(x));
  
  if (arr.length < 3) {
    alert('Please enter at least 3 numbers for a good visualization!');
    return null;
  }
  if (arr.length > 15) {
    alert('For optimal clarity of pills and trees, keep the array size between 3 and 15 numbers.');
    return arr.slice(0, 15);
  }
  return arr;
}

// Presets generators
function handlePreset(type) {
  let arr = [];
  const size = 8; // Friendly medium size

  if (type === 'random') {
    for (let i = 0; i < size; i++) {
      arr.push(Math.floor(Math.random() * 18) + 2); // Random items 2 to 20
    }
  } else if (type === 'nearly') {
    arr = [2, 3, 5, 4, 7, 8, 12, 10]; // Small swaps
  } else if (type === 'reverse') {
    arr = [18, 15, 12, 9, 7, 5, 3, 1]; // Reverse sorted
  } else if (type === 'sorted') {
    arr = [1, 3, 5, 7, 9, 12, 15, 18]; // Already sorted
  }

  dom.arrayInput.value = arr.join(', ');
  loadAlgorithmTrace(arr, activeAlgorithm);
}

// Switch algorithms view tabs
function switchAlgorithm(algo) {
  activeAlgorithm = algo;

  // Tab button toggles
  dom.algoTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.algo === algo);
  });

  // Code visual panels switch
  dom.codeBoxes.forEach(box => {
    box.classList.remove('active');
  });
  const targetCodeBox = document.getElementById(`code-${algo}-box`);
  if (targetCodeBox) targetCodeBox.classList.add('active');

  // Trigger trace recalculation
  const arr = parseCustomArray(dom.arrayInput.value) || [8, 3, 5, 9, 1, 6, 2, 7];
  loadAlgorithmTrace(arr, activeAlgorithm);
}

// ==========================================================================
// 9. Event Listeners & Theme Setup
// ==========================================================================
function initApp() {
  // Default values and loading
  const startArr = [8, 3, 5, 9, 1, 6, 2, 7];
  loadAlgorithmTrace(startArr, activeAlgorithm);

  // Playback Control Button listeners
  dom.btnPlayPause.addEventListener('click', () => {
    if (playbackInterval) {
      pausePlayback();
    } else {
      startPlayback();
    }
  });

  dom.btnNext.addEventListener('click', stepForward);
  dom.btnPrev.addEventListener('click', stepBackward);
  dom.btnReset.addEventListener('click', resetPlayback);

  // Timeline slider drags
  dom.timelineSlider.addEventListener('input', (e) => {
    currentStepIndex = parseInt(e.target.value, 10);
    renderStep(currentStepIndex);
  });

  // Speed slider changes
  dom.speedSlider.addEventListener('input', (e) => {
    changeSpeed(parseInt(e.target.value, 10));
  });

  // Apply manual array
  dom.applyArrayBtn.addEventListener('click', () => {
    const arr = parseCustomArray(dom.arrayInput.value);
    if (arr) {
      loadAlgorithmTrace(arr, activeAlgorithm);
    }
  });

  // Presets select listener
  dom.presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      handlePreset(e.target.dataset.preset);
    });
  });

  // Algo Tabs switch listener
  dom.algoTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchAlgorithm(e.target.dataset.algo);
    });
  });

  // Theme Switcher Button listener
  dom.themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
  });

  // Speed defaults initialization
  changeSpeed(parseInt(dom.speedSlider.value, 10));
}

// Launch application on content load
window.addEventListener('DOMContentLoaded', initApp);
