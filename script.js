let cluesRow, cluesCol;
let numCols, numRows;
let grid;
let lastGrid;
let lastCluesRow, lastCluesCol;
let wasClueClickedLast = false;
let wasGridCleared = false;

let puzzleList;
let loadedPuzzle;
let loadedDifficulty;
let loadedPuzzleIndex;
let loadedDifficultyIndex;
let numPuzzleOptions;
let numDifficultyOptions;
let numCluesPerCol = 0;
let numCluesPerRow = 0;

const gameEl = document.getElementById('game'); // div that holds the game
const message = document.getElementById('message');
let gridValue = null;   //the next value to be filled in the grid (0, 1, or 2)
let isWinner = false;
let matchedRows, matchedCols;

let dragStart = null; // { r, c }
let dragDirection = null; // 'horizontal' | 'vertical'
let lastFilledCell = null;
let dragLock = true;
let isMousePointer = null;
let isMobileDragging = false;  //used to check if dragging in mobile
//1 - left click defaults to fill. 2 - left click defaults to mark.
let toggleBtnMode = 1;
const winStyle = document.createElement('style');

let playMusicBtn, difficultySelect, puzzleSelect, loadPuzzleBtn, clearPuzzleBtn, nextPuzzleBtn, undoBtn;

function loadPuzzleList() {
    puzzleList = [];
    // import puzzle list
    fetch('puzzles/index.json')
        .then(response => response.json())
        .then(data => {
            puzzleList = data;
            puzzleList.sort((a, b) => a[0] > b[0]);
            loadedDifficultyIndex = localStorage.getItem('picross_last_difficulty_i');
            loadedPuzzleIndex = localStorage.getItem('picross_last_puzzle_i');
            loadedPuzzle = localStorage.getItem('picross_last_puzzle');

            if (!loadedDifficultyIndex || !loadedPuzzleIndex || !loadedPuzzle) {
                console.log("last  loaded puzzle not found. loading first puzzle");
                populatePuzzleList(0, 0);
                loadPuzzle(puzzleList[0][0]);
            }
            else {
                console.log("last loaded puzzle found: " + loadedDifficultyIndex + " " + loadedPuzzleIndex);
                populatePuzzleList(loadedDifficultyIndex, loadedPuzzleIndex);
                loadPuzzle(loadedPuzzle);
            }
        })
        .catch(err => console.error('failed to load JSON:', err));
}

function loadPuzzle(selectedPuzzle) {
    console.log("loading " + selectedPuzzle);
    loadedPuzzle = selectedPuzzle;
    loadedDifficulty = difficultySelect.value;
    loadedPuzzleIndex = puzzleSelect.selectedIndex;
    loadedDifficultyIndex = difficultySelect.selectedIndex;
    numPuzzleOptions = puzzleSelect.length;
    numDifficultyOptions = difficultySelect.length;
    // import puzzle
    fetch('puzzles/' + selectedPuzzle)
        .then(response => response.json())
        .then(data => {
            cluesRow = data.hClues;
            cluesCol = data.vClues;
            let tempInfo = updateNumClues(cluesCol);
            numCols = tempInfo[0];
            numCluesPerCol = tempInfo[1];
            tempInfo = updateNumClues(cluesRow)
            numRows = tempInfo[0];;
            numCluesPerRow = tempInfo[1];
            // 2d array (numRows x numCols) that stores the last grid state. 0 is blank, 1 is filled, and 2 is marked
            lastGrid = Array.from({ length: numRows }, () => Array(numCols).fill(0));   // the main board's undo state
            lastCluesRow = JSON.parse(JSON.stringify(cluesRow));
            lastCluesCol = JSON.parse(JSON.stringify(cluesCol));
            resetSettings();
            loadGame();
            saveGame();
        })
        .catch(err => console.error('Failed to load JSON:', err));
}



function saveGame() {
    try {
        const saveData = {
            grid,
            cluesRow,
            cluesCol,
            // numCols,
            // numRows,
            // loadedPuzzle,
            // loadedPuzzleIndex,
            // loadedDifficultyIndex,
            lastGrid,
            lastCluesRow,
            lastCluesCol,
            wasClueClickedLast,
            wasGridCleared
            // isWinner
        };
        localStorage.setItem('picross_save_' + loadedPuzzle, JSON.stringify(saveData));
        localStorage.setItem('picross_last_difficulty_i', loadedDifficultyIndex);
        localStorage.setItem('picross_last_puzzle_i', loadedPuzzleIndex);
        localStorage.setItem('picross_last_puzzle', loadedPuzzle);

        console.log('saved progress for', loadedPuzzle);
    } catch (err) {
        console.error('failed to save progress:', err);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem('picross_save_' + loadedPuzzle);
        if (!raw) return null;
        const rawObj = JSON.parse(raw);
        console.log("savegame found");
        grid = rawObj.grid;
        lastGrid = rawObj.lastGrid;
        lastCluesRow = rawObj.lastCluesRow;
        lastCluesCol = rawObj.lastCluesCol;
        cluesRow = rawObj.cluesRow;
        cluesCol = rawObj.cluesCol;
        wasClueClickedLast = rawObj.wasClueClickedLast;
        wasGridCleared = rawObj.wasGridCleared;
        renderGrid(cluesRow, cluesCol, numCols, numRows);
        checkIfWinner(-1, -1);
    } catch (err) {
        console.error('failed to parse save for', loadedPuzzle, err);
    }
}


function resetSettings() {
    matchedRows = null;
    matchedCols = null;
    grid = Array.from({ length: numRows }, () => Array(numCols).fill(0));   // the main board
    clearCluesArr(cluesRow);
    clearCluesArr(cluesCol);
    gameEl.style.setProperty('--grid-size-x', numCols + numCluesPerRow);
    gameEl.style.setProperty('--grid-size-y', numRows + numCluesPerCol);
    winStyle.remove();
    nextPuzzleBtn.style.display = 'none';
    message.classList.remove('winning-text');
    clearPuzzleBtn.classList.remove('disabled-btn');
    undoBtn.classList.remove('disabled-btn');
    message.innerHTML = '';
    isWinner = false;
    renderGrid(cluesRow, cluesCol, numCols, numRows);
}

function populatePuzzleList(selectedDifficultyIndex, selectedPuzzleIndex) {
    puzzleSelect.innerHTML = '';
    puzzleList.forEach((puzzle, i) => {
        if (puzzle[2] == difficultySelect.options[selectedDifficultyIndex].value) {
            let newOption = document.createElement('option');
            newOption.value = puzzle[0];
            let puzzleName = puzzle[0].substring(0, puzzle[0].length - 5); //remove .json
            if (puzzleName[0] == "0") {
                puzzleName = puzzleName.substring(1, puzzleName.length);
            }
            const raw = localStorage.getItem('picross_save_' + puzzle[0]);
            newOption.text = puzzleName;
            if (raw) {
                if (JSON.parse(raw).isWinner) {
                    newOption.text += "✅";
                }
            }
            puzzleSelect.appendChild(newOption);
        }
    });
    difficultySelect.selectedIndex = selectedDifficultyIndex;
    puzzleSelect.selectedIndex = selectedPuzzleIndex;
}

document.addEventListener('pointerup', (e) => {
    gridValue = null;
    dragStart = null;
    dragDirection = null;
    lastFilledCell = null;
});


const sounds = {
    fill: new Audio('assets/fill_1.wav'),
    mark: new Audio('assets/mark_1.wav'),
    undo: new Audio('assets/undo_1.wav'),
    bgm1: new Audio('assets/bgm1.mp3')
};

document.addEventListener('DOMContentLoaded', () => {
    playMusicBtn = document.getElementById('playMusic');
    difficultySelect = document.getElementById('difficulty');
    puzzleSelect = document.getElementById('puzzle');
    loadPuzzleBtn = document.getElementById('loadPuzzle');
    clearPuzzleBtn = document.getElementById('clearPuzzle');
    nextPuzzleBtn = document.getElementById('nextPuzzle');
    undoBtn = document.getElementById('undo');

    playMusicBtn.addEventListener('click', () => {
        if (sounds.bgm1.paused) {
            sounds.bgm1.loop = true;
            sounds.bgm1.play();
            playMusicBtn.innerHTML = '<i class="fa-solid fa-stop"></i>music'
        }
        else {
            sounds.bgm1.pause();
            playMusicBtn.innerHTML = '<i class="fa-solid fa-play"></i>music'
        }


    });

    difficultySelect.addEventListener('change', () => {
        populatePuzzleList(difficultySelect.selectedIndex, 0);


    });
    loadPuzzleBtn.addEventListener('click', () => {
        loadPuzzle(puzzleSelect.value);

    });
    undoBtn.addEventListener('click', () => {
        sounds.undo.currentTime = 0;
        sounds.undo.play();
        undoMove();
    });

    clearPuzzleBtn.addEventListener('click', () => {
        sounds.undo.currentTime = 0;
        sounds.undo.play();
        // copy values of grid, cluesRow, and cluesCol before modifying them (used for undo)
        for (let i = 0; i < grid.length; i++) {
            lastGrid[i] = grid[i].slice();
        }
        lastCluesRow = JSON.parse(JSON.stringify(cluesRow));
        lastCluesCol = JSON.parse(JSON.stringify(cluesCol));
        resetSettings();
        saveGame();
        wasGridCleared = true;
    });

    nextPuzzleBtn.addEventListener('click', () => {
        let nextPuzzleIndex = loadedPuzzleIndex + 1;
        let nextDifficultyIndex = loadedDifficultyIndex;
        // console.log("numPuzzleOptions: " + numPuzzleOptions);
        if (nextPuzzleIndex >= numPuzzleOptions) {
            nextDifficultyIndex = loadedDifficultyIndex + 1;
            nextPuzzleIndex = 0;
        }

        populatePuzzleList(nextDifficultyIndex, nextPuzzleIndex);
        nextPuzzleValue = puzzleSelect.options[nextPuzzleIndex].value
        loadPuzzle(nextPuzzleValue);

    });
    loadPuzzleList();

});
document.addEventListener('contextmenu', e => e.preventDefault()); // stop right click menu
//cluesArr is either cluesRow or cluesCol
//this function returns [numCols/numRows, numCluesPerRow/numcluesPerCol]
function updateNumClues(cluesArr) {
    puzzleInfo = [] //puzzleInfo[0] = size, [1] = max amount of clues
    puzzleInfo.push(cluesArr.length)
    max = 0;
    cluesArr.forEach((subarray, r) => {
        if (subarray.length > max) {
            max = subarray.length;
        }
    });
    // max number of clues should never be more than ceiling(length / 2)
    if (max > Math.ceil(puzzleInfo[0] / 2)) {
        max = Math.ceil(puzzleInfo[0] / 2);
    }
    puzzleInfo.push(max);
    return puzzleInfo;
}

//this function resets all values in cluesRow/cluesCol so that they are not filled
function clearCluesArr(cluesArr) {
    cluesArr.forEach((subarray, r) => {
        subarray.forEach((clue) => {
            clue[1] = 0;
        });
    });
}

function renderGrid(cluesRow, cluesCol, numCols, numRows) {
    gameEl.innerHTML = '';
    // print clues above grid rows
    // use reverse order to fill bottom clues first
    for (let r = numCluesPerCol - 1; r >= 0; r--) {
        //put empty squares in top-left corner
        for (let c = 0; c < numCluesPerRow; c++) {
            if (r == 0 && c == numCluesPerRow - 1) {
                let toggleBtn = document.createElement('div');
                if (numCluesPerRow == 1) {
                    toggleBtn.style.width = "90%";
                    toggleBtn.style.marginLeft = "0%";

                }
                toggleBtn.id = "toggle";
                if (toggleBtnMode == 1) {
                    toggleBtn.innerHTML = "✏️";
                }
                else {
                    toggleBtnMode = 2;
                    toggleBtn.innerHTML = "❌";
                }
                gameEl.appendChild(toggleBtn);
                toggleBtn.addEventListener('click', () => {
                    if (toggleBtnMode == 1) {
                        toggleBtnMode = 2;
                        toggleBtn.innerHTML = "❌";
                    }
                    else {
                        toggleBtnMode = 1;
                        toggleBtn.innerHTML = "✏️";
                    }
                    sounds.fill.currentTime = 0;
                    sounds.fill.play();
                    // console.log(toggleBtnMode);
                });
            }

            else {
                const emptyDiv = document.createElement('div');
                emptyDiv.classList.add('empty');
                gameEl.appendChild(emptyDiv);
            }

        }
        //put clues above grid
        for (let c = 0; c < numCols; c++) {
            if (c < cluesCol.length) {
                renderClues(r, c, false);   // render vertical clues
            }
        }
    }

    grid.forEach((row, r) => {
        if (r < cluesRow.length) {
            // put clues on left of columns
            // use reverse order to fill rightmost clues first
            for (let c = numCluesPerRow - 1; c >= 0; c--) {
                renderClues(r, c, true);   // render vertical clues
            }
            // put in the main grid
            row.forEach((cell, c) => {
                const div = document.createElement('div');
                div.classList.add('cell');
                if (cell === 1) {
                    div.classList.add('filled');
                    // div.textContent = '◼';
                }
                if (cell === 2) {
                    div.classList.add('marked');
                    // div.textContent = '◈';
                }
                if ((c + 1) % 5 === 0) div.classList.add('rborder');
                if ((r + 1) % 5 === 0) div.classList.add('bborder');

                addEventListeners(div, r, c);
                gameEl.appendChild(div);
            });
        }
    });

}

function renderClues(r, c, isHorizontal) {
    let cluesArr, index1, index2, classToBeAdded;
    // horizontal and vertical clues search opposite indexes
    if (isHorizontal) {
        cluesArr = cluesRow;
        index1 = r, index2 = c;
        classToBeAdded = 'clue-row';
    }
    else {
        cluesArr = cluesCol;
        index1 = c, index2 = r;
        classToBeAdded = 'clue-col';
    }
    let subgridSize = cluesArr[index1].length;   //cluesArr, index1
    const clueDiv = document.createElement('div');
    let nextIndex = subgridSize - index2 - 1;    //index2
    if (nextIndex >= 0) {
        clueDiv.textContent = cluesArr[index1][nextIndex][0]; //cluesArr, index1
        if (cluesArr[index1][nextIndex][1] === 1) {  //cluesArr, index1
            clueDiv.classList.add('clue-marked');
        }
        else {
            clueDiv.classList.remove('clue-marked');
        }
    };
    clueDiv.classList.add('cell', 'clue', classToBeAdded);  //classToBeAdded
    addEventListeners(clueDiv, r, c);
    if (!clueDiv.textContent) {
        clueDiv.classList.add('clue-empty');
    }
    gameEl.appendChild(clueDiv);
}

function addEventListeners(div, r, c) {
    div.addEventListener('mouseenter', (e) => handleCellMouseEnter(r, c, e));
    div.addEventListener('mouseleave', (e) => handleCellMouseLeave(r, c, e));
    // div.addEventListener('mouseleave', handleCellMouseLeave);
    div.addEventListener('pointerdown', (e) => handleCellMouseDown(r, c, e));
    div.addEventListener('pointerup', function (e) {
        handleMobileLeftClick(r, c, e);
        saveGame();
    });
    div.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        handleMobileRightClick(r, c, e);
        return false;
    }, false);
    div.addEventListener('mousemove', function (e) {
        isMobileDragging = true;
    });
}

//if matchedRows or matchedCols is null, check all rows and columns (only do this on load)
//otherwise, only check that row and column for matches and update matchRows and matchCols
//if all matchRows and matchCols are true, it's a winner
function checkIfWinner(rowNumToCheck, colNumToCheck) {
    if (rowNumToCheck === -1 || colNumToCheck === -1 ||
        matchedRows == null || matchedCols == null) {
        console.log("CHECKING ALL ROWS AND COLUMNS");
        matchedRows = new Array(numRows).fill(false);
        matchedCols = new Array(numCols).fill(false);
        //check rows first
        for (let r = 0; r < numRows; r++) {
            if (checkLine(r, true)) {
                matchedRows[r] = true;
            }
        }

        //check cols second
        for (let c = 0; c < numCols; c++) {
            if (checkLine(c, false)) {
                matchedCols[c] = true;
            }
        }
    }

    //if just one cell was filled, only need to check that row/col
    else {
        matchedRows[rowNumToCheck] = checkLine(rowNumToCheck, true);
        matchedCols[colNumToCheck] = checkLine(colNumToCheck, false);
    }



    console.log("MATCHCHECK");

    //check if all rows and cols match
    //check rows first
    for (let r = 0; r < numRows; r++) {
        console.log('checking row ' + r)
        if (matchedRows[r] === false) {
            console.log('stopping the search, row ' + r + ' failed.');
            console.log(matchedRows);
            return;
        }
    }
    console.log('all rows passed!!!');

    //check cols second
    for (let c = 0; c < numCols; c++) {
        console.log('checking col ' + c)
        if (matchedCols[c] === false) {
            console.log('stopping the search, col ' + c + ' failed.');
            console.log(matchedCols);
            return;
        }
    }
    console.log('all rows and cols passed!!!');
    winrar();

}


function checkLine(i, isHorizontal) {
    let lineString = '';
    let cluesArr;
    if (isHorizontal) {
        cluesArr = cluesRow;
        for (let c = 0; c < numCols; c++) {
            lineString += grid[i][c];
        }
    }
    else {
        cluesArr = cluesCol;
        for (let r = 0; r < numRows; r++) {
            lineString += grid[r][i];
        }
    }
    // console.log(lineString);
    // get runs of consecutive 1s
    let runs = lineString.match(/1+/g)?.map(run => run.length) || [];
    // check if it's a 0 clue first
    if (cluesArr[i][0][0] == 0) {
        if (runs.length == 0) {
            return true;
        }
    }
    // break if grid size doesnt match
    if (runs.length !== cluesArr[i].length) {
        return false;
    }
    // check if runs match pattern exactly
    for (let c = 0; c < cluesArr[i].length; c++) {
        if (runs[c] != cluesArr[i][c][0]) {
            return false;
        }
    }
    return true;
}


function winrar() {
    // the last puzzle has not been loaded, enable the 'next puzzle' button
    console.log("winrar " + loadedPuzzleIndex + " " + loadedDifficultyIndex);
    // console.log("totals: " + numPuzzleOptions + " " + numDifficultyOptions);
    if (loadedPuzzleIndex == numPuzzleOptions - 1 &&
        loadedDifficultyIndex == numDifficultyOptions - 1) {
        console.log("last puzzle solved");
    }
    else {
        nextPuzzleBtn.style.display = 'block';
    }
    winStyle.innerHTML = `
  .clue {
    background: green !important;
  }
  .cell {
    border: none !important;
    color: transparent !important;
    cursor: auto !important;
  }
`;
    document.head.appendChild(winStyle);
    let answer = 'a winner is you :)';
    puzzleList.forEach((puzzle, i) => {
        if (puzzle[0] == loadedPuzzle) {
            answer = puzzle[1];
        }
    });
    message.classList.add('winning-text');
    clearPuzzleBtn.classList.add('disabled-btn');
    undoBtn.classList.add('disabled-btn');
    isWinner = true;
    message.innerHTML = answer;
    puzzleSelectText = puzzleSelect.options[loadedPuzzleIndex].text;
    if (puzzleSelectText[puzzleSelectText.length - 1] != '✅') {
        puzzleSelect.options[loadedPuzzleIndex].text += '✅';
    }
}

function stopAllSounds() {
    const audios = [sounds.fill, sounds.mark, sounds.undo];
    // pause and reset all sounds
    audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.play = () => {
            return Promise.resolve();
        };
    });
}

function handleCellMouseDown(r, c, e) {
    const cell = e.currentTarget;
    let isClueCell = cell.classList.contains('clue');
    isMousePointer = e.pointerType === "mouse";
    if (isWinner) {
        return;
    }
    // update lastGrid (undo state) only if the last filled cell was not a clue
    if (!isClueCell) {
        for (let i = 0; i < grid.length; i++) {
            lastGrid[i] = grid[i].slice();
        }
    }
    // update lastClues (undo state) only if the last filled was not on the gril
    else {
        lastCluesRow = JSON.parse(JSON.stringify(cluesRow));
        lastCluesCol = JSON.parse(JSON.stringify(cluesCol));
    }
    isMobileDragging = false;

    //do not continue if on mobile - mobile clicks have their own functions
    if (!isMousePointer) {
        //highlight cell as soon as user touches the screen
        highlightCells(r, c, cell);
        return;
    }
    if (e.button === 0 && !isClueCell) { // left click on tile
        gridValue = grid[r][c] === toggleBtnMode ? 0 : toggleBtnMode;
    } else if (e.button === 2 && !isClueCell) { // right click on tile
        if (toggleBtnMode == 1) {
            gridValue = grid[r][c] === 2 ? 0 : 2;
        }
        else {
            gridValue = grid[r][c] === 1 ? 0 : 1;
        }
    }
    // if its a clue, the gridValue will be the opposite of the clue's current value
    else if (isClueCell) {
        setGridValueForClueCell(r, c, cell);
    }
    dragStart = { r: r, c: c, lastR: null, lastC: null };
    dragDirection = null;
    toggleFill(r, c, cell);

}

function setGridValueForClueCell(r, c, cell) {
    if (cell.classList.contains('clue-col')) {
        subgridSize = cluesCol[c].length;
        const itemFromTop = subgridSize - r - 1;
        const currentValue = cluesCol[c][itemFromTop][1];
        gridValue = currentValue === 1 ? 0 : 1; // set new drag value
    }
    else if (cell.classList.contains('clue-row')) {
        subgridSize = cluesRow[r].length;
        const itemFromRight = subgridSize - c - 1;
        const currentValue = cluesRow[r][itemFromRight][1];
        gridValue = currentValue === 1 ? 0 : 1; // set new drag value
    }
}

function handleMobileLeftClick(r, c, e) {
    const cell = e.currentTarget;
    let isClueCell = cell.classList.contains('clue');
    if (isMobileDragging || isMousePointer) {
        return;
    }
    if (isClueCell) {
        setGridValueForClueCell(r, c, cell);
    }
    else if (e.button === 0) { // left click on tile
        if (!isClueCell) {
            gridValue = grid[r][c] === toggleBtnMode ? 0 : toggleBtnMode;
        }
        else {
            gridValue = grid[r][c] === toggleBtnMode ? 0 : toggleBtnMode;
        }

    }
    toggleFill(r, c, cell);
    // console.log("mobile");
}

//only runs if its a touch right click event
function handleMobileRightClick(r, c, e) {
    const cell = e.currentTarget;
    let isClueCell = cell.classList.contains('clue');
    if (!isMousePointer) {
        if (isClueCell) {
            setGridValueForClueCell(r, c, cell);
        }
        // console.log("its a touchscreen");
        else if (toggleBtnMode == 1) {
            gridValue = grid[r][c] === 2 ? 0 : 2;
        }
        else if (toggleBtnMode == 2) {
            gridValue = grid[r][c] === 1 ? 0 : 1;
        }
        toggleFill(r, c, cell);
    }
}

function handleCellMouseEnter(r, c, e) {
    if (isWinner) {
        return;
    }
    const cell = e.currentTarget;

    if (gridValue != null && dragStart) {
        const dRow = r - dragStart.r;
        const dCol = c - dragStart.c;

        // lock the direction on first movement
        if (!dragDirection) {
            if (Math.abs(dRow) >= 1 || Math.abs(dCol) >= 1) {
                if (Math.abs(dRow) > Math.abs(dCol)) {
                    dragDirection = 'vertical';
                } else {
                    dragDirection = 'horizontal';
                }
            }
        }

        // only fill if aligned with the locked axis
        if ((dragDirection === 'vertical') ||
            (dragDirection === 'horizontal')) {
            toggleFill(r, c, cell);
        }
    }
    else {
        //for mouse - highlight cell on every mouseEnter event if nothing is clicked
        highlightCells(r, c, cell);
    }
}

function highlightCells(r, c, cell) {
    // clear previous highlights
    clearHighlights();
    const totalCols = numCols + numCluesPerRow;
    const totalRows = numRows + numCluesPerCol;

    if (isWinner) {
        return;
    }
    // highlight the row (including clue tiles)
    if (!cell.classList.contains('clue-col')) {
        for (let col = 0; col < totalCols; col++) {
            const index = (r + numCluesPerCol) * totalCols + col;
            gameEl.children[index].classList.add('highlight-row');
        }
    }

    // highlight the column (including clue tiles)
    if (!cell.classList.contains('clue-row')) {
        for (let row = 0; row < totalRows; row++) {
            const index = row * totalCols + (c + numCluesPerRow);
            if (index < gameEl.children.length) {
                gameEl.children[index].classList.add('highlight-col');
            }
        }
    }
}

function clearHighlights() {
    document.querySelectorAll('.highlight-row, .highlight-col')
        .forEach(el => el.classList.remove('highlight-row', 'highlight-col'));
}

function handleCellMouseLeave(r, c, e) {
    // clear highlights when leaving the grid
    clearHighlights();
}

function toggleFill(r, c, cell) {
    let rowToFill = r, colToFill = c;
    let isClue = cell.classList.contains('clue');
    //return if entering from an empty cell
    if (cell.classList.contains('clue-empty')) {
        highlightCells(rowToFill, colToFill, cell);
        return;
    }
    //return if crossing the grid/clue border
    if (lastFilledCell != null) {
        if ((lastFilledCell.classList.contains('clue') &&
            !isClue) ||
            (!lastFilledCell.classList.contains('clue') &&
                isClue)) {
            highlightCells(rowToFill, colToFill, cell);
            return;
        }
    }
    // grid draglock logic - lock to the horizontal or vertical row based on movement
    if (lastFilledCell != null) {
        if (!lastFilledCell.classList.contains('clue')) {
            if (dragLock && dragDirection === 'horizontal') {
                rowToFill = dragStart.r;
                // return if old value is same as new value
                if (grid[rowToFill][colToFill] == gridValue) {
                    highlightCells(rowToFill, colToFill, cell);
                    return;
                }
                if (dragStart.c < colToFill) {
                    // fill in row from last filled column -> current cell
                    for (let iC = dragStart.lastC; iC < colToFill; iC++) {
                        grid[dragStart.r][iC] = gridValue;
                        checkIfWinner(dragStart.r, iC);
                    }
                }
                else {
                    // fill in row from last filled column -> current cell
                    for (let iC = dragStart.lastC; iC > colToFill; iC--) {
                        grid[dragStart.r][iC] = gridValue;
                        checkIfWinner(dragStart.r, iC);
                    }
                }
            }
            else if (dragLock && dragDirection === 'vertical') {
                colToFill = dragStart.c;
                // return if old value is same as new value
                if (grid[rowToFill][colToFill] == gridValue) {
                    highlightCells(rowToFill, colToFill, cell);
                    return;
                }
                if (dragStart.r < rowToFill) {
                    // fill in column from last filled row -> current cell
                    for (let iR = dragStart.lastR; iR < rowToFill; iR++) {
                        grid[iR][dragStart.c] = gridValue;
                        checkIfWinner(iR, dragStart.c);
                    }
                }
                else {
                    // fill in column from last filled row -> current cell
                    for (let iR = dragStart.lastR; iR > rowToFill; iR--) {
                        grid[iR][dragStart.c] = gridValue;
                        checkIfWinner(iR, dragStart.c);
                    }
                }
            }
        }
    }

    //grid fill logic
    if (!cell.classList.contains('clue')) {
        wasClueClickedLast = false;
        wasGridCleared = false;
        grid[rowToFill][colToFill] = gridValue;
        if (isMousePointer) {
            dragStart.lastC = colToFill;
            dragStart.lastR = rowToFill;
        }
        if (gridValue === 1) {
            sounds.fill.currentTime = 0;
            sounds.fill.play();
        }
        if (gridValue === 0) {
            sounds.undo.currentTime = 0;
            sounds.undo.play();
        }
        if (gridValue === 2) {
            sounds.mark.currentTime = 0;
            sounds.mark.play();
        }
        checkIfWinner(rowToFill, colToFill);
        renderGrid(cluesRow, cluesCol, numCols, numRows);

    }
    else {
        // handle clue cells with drag support
        wasClueClickedLast = true;
        wasGridCleared = false;

        if (cell.classList.contains('clue-col')) {
            // determine the target column
            subgridSize = cluesCol[c].length;
            const itemFromTop = subgridSize - r - 1;

            const oldValue = cluesCol[c][itemFromTop][1];
            cluesCol[c][itemFromTop][1] = gridValue;
            if (cluesCol[c][itemFromTop][1] !== oldValue) {
                sounds.fill.currentTime = 0;
                sounds.fill.play();
                renderGrid(cluesRow, cluesCol, numCols, numRows);
            }
        }
        else if (cell.classList.contains('clue-row')) {
            // determine the target row
            subgridSize = cluesRow[r].length;
            const itemFromRight = subgridSize - c - 1;
            const oldValue = cluesRow[r][itemFromRight][1];
            cluesRow[r][itemFromRight][1] = gridValue;
            if (cluesRow[r][itemFromRight][1] !== oldValue) {
                sounds.fill.currentTime = 0;
                sounds.fill.play();
                renderGrid(cluesRow, cluesCol, numCols, numRows);
            }
        }
    }
    lastFilledCell = cell;
    highlightCells(rowToFill, colToFill, cell);
}

function undoMove() {
    //if the grid was cleared, undo last clue and grid move
    //otherwise just undo one 
    // console.log("was grid cleared: " + wasGridCleared);
    if (wasClueClickedLast || wasGridCleared) {
        console.log("restoring clues");
        tempCluesRow = JSON.parse(JSON.stringify(cluesRow));
        cluesRow = JSON.parse(JSON.stringify(lastCluesRow));
        lastCluesRow = tempCluesRow;
        tempCluesCol = JSON.parse(JSON.stringify(cluesCol));
        cluesCol = JSON.parse(JSON.stringify(lastCluesCol));
        lastCluesCol = tempCluesCol;
    }
    if (!wasClueClickedLast || wasGridCleared) {
        console.log("restoring grid");
        for (let i = 0; i < grid.length; i++) {
            let tempRow = grid[i];
            grid[i] = lastGrid[i].slice();
            lastGrid[i] = tempRow;
        }
    }
    renderGrid(cluesRow, cluesCol, numCols, numRows);
    saveGame();
}