let cluesRow, cluesCol;
let sizeX, sizeY;
let grid;
let puzzleList;
let puzzleAnswer;

function loadPuzzleList(isFirstLoad) {
    puzzleList = [];
    puzzleSelect.innerHTML = '';
    // import puzzle list
    fetch('puzzles/index.json')
        .then(response => response.json())
        .then(data => {
            puzzleList = data;
            puzzleList.sort((a, b) => a[0] > b[0]);
            console.log("selected: " + difficultySelect.value);
            console.log("puzzleList: " + puzzleList[1][0]);
            let puzzleSelect = document.getElementById("puzzleSelect");
            puzzleList.forEach((puzzle, i) => {
                if (puzzle[2] == difficultySelect.value) {
                    let newOption = document.createElement('option');
                    newOption.value = puzzle[0];
                    let puzzleName = puzzle[0].substring(0, puzzle[0].length - 5); //remove .json
                    if (puzzleName[0] == "0") {
                        puzzleName = puzzleName.substring(1, puzzleName.length);
                    }
                    newOption.text = puzzleName;
                    puzzleSelect.appendChild(newOption);
                }
            });
            if (isFirstLoad) {
                loadPuzzle(puzzleList[0][0]);
            }
        })
        .catch(err => console.error('Failed to load JSON:', err));
}
function loadPuzzle(selectedPuzzle) {
    console.log("loading " + selectedPuzzle)
    // import puzzle
    fetch('puzzles/' + selectedPuzzle)
        .then(response => response.json())
        .then(data => {
            cluesRow = data.hClues;
            cluesCol = data.vClues;
            sizeX = updateNumClues(cluesCol)[0];
            sizeY = updateNumClues(cluesRow)[0];;
            numCluesPerRow = updateNumClues(cluesRow)[1];
            numCluesPerCol = updateNumClues(cluesCol)[1];
            // State: 0 empty, 1 filled, 2 marked
            grid = Array.from({ length: sizeY }, () => Array(sizeX).fill(0));   // the main board
            lastGrid = grid.slice();
            gameEl.style.setProperty('--grid-size-x', sizeX + numCluesPerRow);
            gameEl.style.setProperty('--grid-size-y', sizeY + numCluesPerCol);
            winStyle.remove();
            message.classList.remove('winning-text');
            message.innerHTML = '';
            winner = false;
            renderGrid(cluesRow, cluesCol, sizeX, sizeY);
        })
        .catch(err => console.error('Failed to load JSON:', err));
}
loadPuzzleList(true);


let numCluesPerCol = 0;
let numCluesPerRow = 0;
const gameEl = document.getElementById('game'); // div that holds the game
const message = document.getElementById('message');
let isMouseDown = false;
let gridValue = null;   //the next value to be filled in the grid (0, 1, or 2)
let winner = false;
let lastGrid = null;
let dragStart = null; // { r, c }
let dragDirection = null; // 'horizontal' | 'vertical'
let lastFilledCell = null;
let lastR, lastC = null;
let dragLock = true;
let isMousePointer = null;
const winStyle = document.createElement('style');


document.addEventListener('pointerup', (e) => {
    isMouseDown = false;
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
sounds.fill.preload = 'auto'; // tell browser to load now
sounds.fill.load(); // start loading immediately


document.addEventListener('DOMContentLoaded', () => {
    const playMusicBtn = document.getElementById('playMusic');
    const difficultySelect = document.getElementById('difficultySelect');
    const puzzleSelect = document.getElementById('puzzleSelect');
    const loadPuzzleBtn = document.getElementById('loadPuzzle');
    const undoBtn = document.getElementById('undo');

    playMusicBtn.addEventListener('click', () => {
        if (sounds.bgm1.paused) {
            // sounds.bgm1.currentTime = 0;
            sounds.bgm1.loop = true;
            sounds.bgm1.play();
            playMusicBtn.innerHTML = '⏹ music'
        }
        else {
            // sounds.bgm1.currentTime = 0;
            sounds.bgm1.pause();
            playMusicBtn.innerHTML = '▶ music'
        }


    });
    difficultySelect.addEventListener('change', () => {
        console.log(difficultySelect.value);
        console.log("oowee: " + puzzleSelect.value);
        // loadPuzzle();
        loadPuzzleList(false);


    });
    loadPuzzleBtn.addEventListener('click', () => {
        console.log(puzzleSelect.value);
        loadPuzzle(puzzleSelect.value);

    });
    // undoBtn.addEventListener('click', () => {
    //     undoMove();
    // });

    sounds.fill.volume = 0;
    sounds.fill.play().then(() => {
        sounds.fill.pause();
        sounds.fill.currentTime = 0;
        sounds.fill.volume = 1; // reset volume
    }).catch(() => {
        // It's okay if this fails before interaction
    });

});
document.addEventListener('contextmenu', e => e.preventDefault()); // stop right click menu
// document.addEventListener('click', () => {
//     sounds.fill.volume = 0;
//     sounds.fill.play().then(() => {
//         sounds.fill.pause();
//         sounds.fill.currentTime = 0;
//         sounds.fill.volume = 1; // reset volume
//     }).catch(() => {
//         // It's okay if this fails before interaction
//     });
// }, { once: true });


//gets called once for width and once for height
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

function renderGrid(cluesRow, cluesCol, sizeX, sizeY) {
    gameEl.innerHTML = '';
    // print clues above grid rows
    // use reverse order to fill bottom clues first
    for (let r = numCluesPerCol - 1; r >= 0; r--) {
        //put empty squares in top-left corner
        for (let c = 0; c < numCluesPerRow; c++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('empty');
            gameEl.appendChild(emptyDiv);
        }
        //put clues above grid
        for (let c = 0; c < sizeX; c++) {
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
    div.addEventListener('mouseleave', handleCellMouseLeave);
    div.addEventListener('pointerdown', (e) => handleCellMouseDown(r, c, e));
    div.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        console.log('right click');
        handleMobileRightClick(r, c, e);
        return false;
    }, false);
    // div.addEventListener('contextmenu', e => e.preventDefault()); // stop right click menu
}

function checkIfWinner() {
    //check rows first, break if one does not match
    console.log('numrows: ' + grid.length);
    console.log('numcols: ' + grid[0].length);
    for (let r = 0; r < grid.length; r++) {
        console.log('Checking row ' + r)
        // if (!checkRow(r)) {
        if (!checkLine(r, true)) {
            console.log('stopping the search, row ' + r + ' failed.');
            return;
        }
    }
    console.log('All rows passed!!!');

    //check cols second, break if one does not match
    for (let c = 0; c < grid[0].length; c++) {
        console.log('Checking col ' + c)
        if (!checkLine(c, false)) {
            // if (!checkCol(c)) {
            console.log('stopping the search, col ' + c + ' failed.');
            return;
        }
    }
    console.log('All rows and cols passed!!!');
    winrar();

}


function checkLine(i, isHorizontal) {
    let lineString = '';
    let cluesArr;
    if (isHorizontal) {
        cluesArr = cluesRow;
        for (let c = 0; c < grid[i].length; c++) {
            lineString += grid[i][c];
        }
    }
    else {
        cluesArr = cluesCol;
        for (let r = 0; r < grid.length; r++) {
            lineString += grid[r][i];
        }
    }
    console.log(lineString);
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
    // stopAllSounds();
    winStyle.innerHTML = `
  .clue {
    animation: glowGreen 2s infinite forwards !important;
    background-color: green !important;
  }
  .cell {
    border: none !important;
    color: transparent !important;
    cursor: auto !important;
  }
`;
    document.head.appendChild(winStyle);

    message.classList.add('winning-text');
    winner = true;
    message.innerHTML = 'a winner is you :)'
}

function stopAllSounds() {
    const audios = [sounds.fill, sounds.mark, sounds.undo];

    // Pause and reset all sounds
    audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.play = () => {
            return Promise.resolve();
        };
    });
}

function handleCellMouseDown(r, c, e) {
    isMousePointer = e.pointerType === "mouse";
    if (winner == true) {
        return;
    }
    const cell = e.currentTarget;
    isMouseDown = true;
    if (e.button === 0) { // left click on tile
        gridValue = grid[r][c] === 1 ? 0 : 1;
    } else if (e.button === 2) { // right click on tile
        gridValue = grid[r][c] === 2 ? 0 : 2;
    }
    dragStart = { r, c };
    dragDirection = null;
    toggleFill(r, c, cell);
}

//only runs if its a touch right click event
function handleMobileRightClick(r, c, e) {
    if (!isMousePointer) {
        const cell = e.currentTarget;
        console.log("its a touchscreen");
        gridValue = grid[r][c] === 2 ? 0 : 2;
        toggleFill(r, c, cell);
    }
}

function handleCellMouseEnter(r, c, e) {
    if (winner == true) {
        return;
    }
    const cell = e.currentTarget;

    if (gridValue != null && dragStart) {
        const dRow = r - dragStart.r;
        const dCol = c - dragStart.c;

        // Lock the direction on first movement
        if (!dragDirection) {
            if (Math.abs(dRow) >= 1 || Math.abs(dCol) >= 1) {
                if (Math.abs(dRow) > Math.abs(dCol)) {
                    dragDirection = 'vertical';
                } else {
                    dragDirection = 'horizontal';
                }
            }
        }

        // Only fill if aligned with the locked axis
        // console.log('dragDirection: ' + dragDirection);
        // console.log('dragStart.c: ' + dragStart.c);
        // console.log('dragStart.r: ' + dragStart.r);

        // console.log('c: ' + c);
        if ((dragDirection === 'vertical') ||
            (dragDirection === 'horizontal')) {
            toggleFill(r, c, cell);
        }
    };



    // Clear previous highlights
    document.querySelectorAll('.highlight-row, .highlight-col')
        .forEach(el => el.classList.remove('highlight-row', 'highlight-col'));

    const totalCols = sizeX + numCluesPerRow;
    const totalRows = sizeY + numCluesPerCol;

    // Highlight the row (including clue tiles)
    if (!cell.classList.contains('clue-col')) {
        for (let col = 0; col < totalCols; col++) {
            const index = (r + numCluesPerCol) * totalCols + col;
            gameEl.children[index].classList.add('highlight-row');
        }
    }

    // Highlight the column (including clue tiles)
    if (!cell.classList.contains('clue-row')) {
        for (let row = 0; row < totalRows; row++) {
            const index = row * totalCols + (c + numCluesPerRow);
            if (index < gameEl.children.length) {
                gameEl.children[index].classList.add('highlight-col');
            }
        }
    }
}

function handleCellMouseLeave() {
    // Clear highlights when leaving the grid
    document.querySelectorAll('.highlight-row, .highlight-col')
        .forEach(el => el.classList.remove('highlight-row', 'highlight-col'));
}

function toggleFill(r, c, cell) {
    // console.log(grid);
    lastGrid = grid.slice();
    console.log(grid);
    let rowToFill = r, colToFill = c;
    let isClue = cell.classList.contains('clue');
    if (cell.classList.contains('clue-empty')) {
        return;
    }
    if (lastFilledCell != null) {
        if ((lastFilledCell.classList.contains('clue') &&
            !isClue) ||
            (!lastFilledCell.classList.contains('clue') &&
                isClue)) {
            return;
        }
    }
    if (lastFilledCell != null) {
        if (!lastFilledCell.classList.contains('clue')) {
            if (dragLock && dragDirection === 'horizontal') {
                if (dragStart.c < lastC) {
                    for (let iC = dragStart.c; iC < lastC; iC++) {
                        console.log("iR: " + dragStart.r + "  iC: " + iC + "  gridVal: " + gridValue);
                        grid[dragStart.r][iC] = gridValue;
                    }
                }
                else {
                    for (let iC = dragStart.c; iC > lastC; iC--) {
                        console.log("iR: " + dragStart.r + "  iC: " + iC + "  gridVal: " + gridValue);
                        grid[dragStart.r][iC] = gridValue;
                    }
                }

                rowToFill = dragStart.r;
            }
            else if (dragLock && dragDirection === 'vertical') {
                if (dragStart.r < lastR) {
                    for (let iR = dragStart.r; iR < lastR; iR++) {
                        console.log("iR: " + iR + "  iC: " + dragStart.c + "  gridVal: " + gridValue);
                        grid[iR][dragStart.c] = gridValue;
                    }
                }
                else {
                    for (let iR = dragStart.r; iR > lastR; iR--) {
                        console.log("iR: " + iR + "  iC: " + dragStart.c + "  gridVal: " + gridValue);
                        grid[iR][dragStart.c] = gridValue;
                    }
                }
                colToFill = dragStart.c;
            }
        }
    }

    if (!cell.classList.contains('clue')) {
        const oldValue = grid[rowToFill][colToFill];
        grid[rowToFill][colToFill] = gridValue;
        if (grid[rowToFill][colToFill] !== oldValue) {
            if (gridValue === 1) {
                sounds.fill.currentTime = 0;
                sounds.fill.play();
                checkIfWinner();
            }
            if (gridValue === 0) {
                sounds.undo.currentTime = 0;
                sounds.undo.play();
                checkIfWinner();
            }
            if (gridValue === 2) {
                sounds.mark.currentTime = 0;
                sounds.mark.play();
            }
        }
    }
    else {
        // handle clue cells with drag support
        if (cell.classList.contains('clue-col')) {
            // determine the target column
            const colIndex = c;

            // if this is the first clue cell in the drag, decide the new value
            if (lastFilledCell == null || !lastFilledCell.classList.contains('clue-col')) {
                subgridSize = cluesCol[colIndex].length;
                const itemFromTop = subgridSize - r - 1;
                const currentValue = cluesCol[colIndex][itemFromTop][1];
                gridValue = currentValue === 1 ? 0 : 1; // set new drag value
            }

            subgridSize = cluesCol[colIndex].length;
            const itemFromTop = subgridSize - r - 1;

            const oldValue = cluesCol[colIndex][itemFromTop][1];
            cluesCol[colIndex][itemFromTop][1] = gridValue;
            if (cluesCol[colIndex][itemFromTop][1] !== oldValue) {
                // if (gridValue === 1) {
                sounds.fill.currentTime = 0;
                sounds.fill.play();
                // }
            }
        }
        else if (cell.classList.contains('clue-row')) {
            // Determine the target row
            const rowIndex = r;

            // If this is the first clue cell in the drag, decide the new value
            if (lastFilledCell == null || !lastFilledCell.classList.contains('clue-row')) {
                subgridSize = cluesRow[rowIndex].length;
                const itemFromRight = subgridSize - c - 1;
                const currentValue = cluesRow[rowIndex][itemFromRight][1];
                gridValue = currentValue === 1 ? 0 : 1; // set new drag value
            }
            subgridSize = cluesRow[rowIndex].length;
            const itemFromRight = subgridSize - c - 1;
            const oldValue = cluesRow[rowIndex][itemFromRight][1];
            cluesRow[rowIndex][itemFromRight][1] = gridValue;
            if (cluesRow[rowIndex][itemFromRight][1] !== oldValue) {
                //     // if (gridValue === 1) {
                sounds.fill.currentTime = 0;
                sounds.fill.play();
                //     // }
            }

        }

    }
    lastR = r;
    lastC = c;
    lastFilledCell = cell;
    renderGrid(cluesRow, cluesCol, sizeX, sizeY);
}

function undoMove() {
    console.log(lastGrid);
    grid = lastGrid;
    renderGrid(cluesRow, cluesCol, sizeX, sizeY);
}