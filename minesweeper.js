const tbody = document.querySelector('tbody');
const button = document.getElementById('button');
const timerContainer = document.getElementById('timer')
const lvl1 = document.getElementById('radio-1');
const lvl2 = document.getElementById('radio-2');
const lvl3 = document.getElementById('radio-3');
const changeSpecial = document.getElementById('radio-special');
const specialSettings = document.getElementsByClassName('special')[0];
const specHeight = document.getElementById('height');
const specWidth = document.getElementById('width');
const specMines = document.getElementById('mines');

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;

  return value;
}

function asyncAlert(message) {
  setTimeout(() => alert(message));
}

// cоздаем отображаемую таблицу
function appendTableCells(n, m) {
  for (let i = 0; i < n; i++) {
    let tr = document.createElement('tr');
    
    for (let i = 0; i < m; i++) {
      let td = document.createElement('td');
      tr.appendChild(td);
    }
    
    tbody.appendChild(tr);
  }
}

function game(rows = 10, columns = 10, bombs = 10) {
  const maxOpenedCells = (rows * columns) - bombs;

  let openedCells = 0;
  let timerId = 0;

  let bombsCounter = bombs;
  let table = createMatrix(rows, columns);

  appendTableCells(rows, columns);

  makeStartButton(button);

  showBombsCounter(bombs);

  for (let i = 0; i < 2; i++) {
    addDivInTimer().classList.add('timer', 'counter-value_0');
  }

  addDivInTimer().classList.add('timer', 'counter-value_separator');

  for (let i = 0; i < 2; i++) {
    addDivInTimer().classList.add('timer', 'counter-value_0');
  }

  const clickHandler = event => {
    if (event.target.nodeName !== 'TD') return;
    
    const [x, y] = getPosition(event.target);
    
    if (isOpened(table, x, y)) return;

    if (openedCells === 0) {

    // запускаем тут таймер и заполняем таблицу:________________________________________!
      timerId = startTimer(table, x, y);
      fillСells(table, x, y, bombs);
      checkCells(table);
    }

    let openedCellsByClick = openCell(table, x, y);

    openedCells = openedCells + openedCellsByClick;

    // победа?_____________________________________________________________________________!!!!!!!!

    if (isDefeat(table, x, y)) {
      losing();
    } else if (maxOpenedCells === openedCells) {
      wining();
      bombsCounter -= showFlags(table, x, y);
      changeBombsCounter(bombsCounter);
    }

    if (isDefeat(table, x, y) || maxOpenedCells === openedCells) {
      clearInterval(timerId);

      tbody.removeEventListener('click', clickHandler);
      tbody.removeEventListener('contextmenu', contextHandler);
    }
  };

  const contextHandler = event => {
    if (event.target.nodeName !== 'TD') return;

    // убираем встроенное контекстное меню:
    event.preventDefault();
  
    const [x, y] = getPosition(event.target);

    if (isOpened(table, x, y)) return;

    const result = toggleFlag(table, x, y);

    bombsCounter = result ? bombsCounter - 1 : bombsCounter + 1;

    changeBombsCounter(bombsCounter);
  };

  // tbody.oncontextmenu = function(event) {

  //   // убираем встроенное контекстное меню:
  //   event.preventDefault();
    
  //   if (event.target.nodeName !== 'TD') return;
  
  //   const [x, y] = getPosition(event.target);

  //   toggleFlag(table, x, y);
  // };
  tbody.addEventListener('click', clickHandler);
  tbody.addEventListener('contextmenu', contextHandler);

  const destroy = () => {
    removeTableCells();
    clearInterval(timerId);
    removeTimer();
    removeBombCounterElements();
    resetButton();

    tbody.removeEventListener('click', clickHandler);
    tbody.removeEventListener('contextmenu', contextHandler);
  };

  return destroy;
}


const minValidator = (minValue, fieldName) => control => {
  if (control.value < minValue) {
    asyncAlert(`Значение ${fieldName} не может быть меньше ${minValue}. Значение изменено на ${minValue}`);
    control.setValue(minValue);
  }
}

const maxValidator = (maxValue, fieldName) => control => {
  if (control.value > maxValue) {
    asyncAlert(`Значение ${fieldName} не может быть больше ${maxValue}. Значение изменено на ${maxValue}`);
    control.setValue(maxValue);
  }
}

class FormGroup {
  listeners = [];

  constructor(group) {
    this.group = group;
    this.listenChanges();
  }

  get value() {
    return Object.keys(this.group).reduce((acc, key) => {
      acc[key] = this.group[key].value;

      return acc;
    }, {});
  }

  valueChanges(fn) {
    this.listeners.push(fn);
  }

  listenChanges() {
    Object.keys(this.group).forEach(key => {
      this.group[key].valueChanges(() => {
        this.listeners.forEach(fn => fn(this.value));
      })
    });
  }
}

class FormControl {
  listeners = [];

  constructor(element, value, validators) {
    this.element = element;
    this.validators = validators;
    this.setValue(value);
    this.listenInputChange();
  }

  setValue(value) {
    this.value = value;
    this.updateValueAndValidity();
    this.updateValue();
    this.listeners.forEach(fn => fn(this.value));
  }

  valueChanges(fn) {
    this.listeners.push(fn);
  }

  updateValue() {
    this.element.value = this.value;
  }

  listenInputChange() {
    this.element.onchange = event => {
        const value = event.target.value;
        this.setValue(+value);
      };
  }

  updateValueAndValidity() {
    this.validators.forEach(validator => validator(this));
  }
}

function main() {
  const heightControl = new FormControl(specHeight, 10, [
    minValidator(3, 'высоты'),
    maxValidator(100, 'высоты'),
  ]);
  const widthControl = new FormControl(specWidth, 10, [
    minValidator(7, 'ширины'),
    maxValidator(100, 'ширины'),
  ]);
  const bombsControl = new FormControl(specMines, 10, [
    minValidator(1, 'количества бомб'),
    control => {
      const maxBombs = heightControl.value * widthControl.value - 1;

      if (control.value > maxBombs) {
        asyncAlert(`Значение количества бомб не может быть больше ${maxBombs}. Значение изменено на ${maxBombs}`);
        control.setValue(maxBombs);
      }
    },
  ]);
  const form = new FormGroup({
    height: heightControl,
    width: widthControl,
    bombs: bombsControl
  });

  let destroy = game();
  let currentLevel = 'easy';

  const restartHandler = event => {
    destroy();

    switch (currentLevel) {
      case 'easy':
        destroy = game(10, 10, 10);
        break;
      case 'medium':
        destroy = game(16, 16, 40);
        break;
      case 'hard':
        destroy = game(16, 30, 99);
        break;
      case 'special':
        destroy = game(form.value.height, form.value.width, form.value.bombs);
    }
  }

  const changeLevelHandler = level => {
    currentLevel = level;

    restartHandler();

    switch (level) {
      case 'easy':
      case 'medium':
      case 'hard':
        specialSettings.classList.remove('special_show');
        break;
      case 'special':
        specialSettings.classList.add('special_show');
        break;
    }
    
  }

  lvl1.onclick = function(event) {
    changeLevelHandler('easy');
  }
  
  lvl2.onclick = function(event) {
    changeLevelHandler('medium');
  }
  
  lvl3.onclick = function(event) {
    changeLevelHandler('hard');
  }

  changeSpecial.onclick = function(event) {
    changeLevelHandler('special');
  }

  form.valueChanges(value => {
    changeLevelHandler('special');
  });

  widthControl.valueChanges(() => {
    bombsControl.updateValueAndValidity();
  });
  heightControl.valueChanges(() => {
    bombsControl.updateValueAndValidity();
  });


  // specHeight.value = customOptions.height;
  // specWidth.value = customOptions.width;
  // specMines.value = customOptions.bombs;

  // specHeight.onchange = function(event) {
  //   const {target} = event;
  //   const {value} = target;
  
  //   if (value < 3) {
  //     target.value = 3;
  //   } else if (value > 100) {
  //     target.value = 100;
  //     asyncAlert('Значение высоты не может быть больше 100. Значение изменено на 100');
  //   }

  //   customOptions.height = target.value;
  // };
  
  // specWidth.onchange = function(event) {
  //   const {target} = event;
  //   const {value} = target;
  
  //   if (value < 3) {
  //     target.value = 3;
  //     asyncAlert('Значение ширины не может быть меньше 3. Значение изменено на 3');
  //   } else if (value > 100) {
  //     target.value = 100;
  //     asyncAlert('Значение ширины не может быть больше 100. Значение изменено на 100');
  //   }

  //   customOptions.width = target.value;
  // };

  // specMines.onchange = function(event) {
  //   const {target} = event;
  //   const {value} = target;
  //   const maxBombs = customOptions.height * customOptions.width - 1;
  
  //   if (value < 1) {
  //     target.value = 1;
  //     asyncAlert('Количество бомб не может быть меньше 1. Значение изменено на 1');
  //   } else if (value > maxBombs) {
  //     target.value = maxBombs;
  //     asyncAlert(`Количество бомб не может быть больше ${maxBombs}. Значение изменено на ${maxBombs}.`);
  //   }

  //   customOptions.bombs = target.value;
  //   changeLevelHandler('special');
  // };

  button.addEventListener('click', restartHandler);
}



main();

/*_______________основное____________________________________________________________*/

function openCell(table, x, y) {
  if (isFlag(table, x, y)) return 0;

  let countOpenedCells = 0;

  countOpenedCells++;

  table[x][y].isOpened = true;

  switch (table[x][y].value) {
    case -1:
      showBombsAndFlags(table, x, y);
      break;
    case 0: 
      showCell(table, x, y);
      countOpenedCells += openGroupCells(table, x, y);
      break;
    default:
      showCell(table, x, y);
  }

  return countOpenedCells;
}

function toggleFlag(table, x, y) {
  const target = getCellElement(x, y);

  if (!table[x][y].hasFlag) {
    target.classList.add('flag');

    table[x][y].hasFlag = true;

    return true;
  } else {
    target.classList.remove('flag');

    table[x][y].hasFlag = false;

    return false;
  }
}

/*__________________________________________________________________*/

function isOpened(table, x, y) {
  return table[x][y].isOpened;
}

function changeBombsCounter(bombsCounter) {
  removeBombCounterElements();
  showBombsCounter(bombsCounter);
}

function removeBombCounterElements() {
  const bombCounterContainer = document.getElementById('bomb-counter');
  const bombCounterElements = new Array(...bombCounterContainer.children);

  for (let div of bombCounterElements) {
    div.remove();
  }
}

function getPosition(tdElement) {
  const rows = tbody.children;
  const trElement = tdElement.parentElement;
  const rowIndex = [...rows].findIndex(el => el === trElement);
  const columnIndex = [...trElement.children].findIndex(el => el === tdElement);
  
  return [rowIndex, columnIndex];
}

// function openCell(table, x, y) {

  
//   // TODO: переписать через switch
//   if (table[x][y] === 'bomb') {
//     showBombs(table);
//   } else {
//     showCell(table, x, y);
//   }
//   if (table[x][y] === 0) {
//     showCell(table, x, y);
//     openGroupCells(table, x, y);
//   }
// }

function countBombs(table, x, y) {
  let count = 0;

  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i === x && j === y) continue;

      if (!cellExist(table, i, j)) continue;

      if (!isBomb(table[i][j])) continue;

      count++;
    }
  }

  return count;
}

function checkCells(table) {
  for(let i = 0; i < table.length; i++) {
    for(let j = 0; j < table[i].length; j++) {
      const cell = table[i][j];

      if (!isBomb(cell)) {
        cell.value = countBombs(table, i, j);
      }
    }
  }
}

function addDivIn(place) {
  const container = document.getElementById(place);

  return container.appendChild(document.createElement('div'));
}

function addDivInTimer() {
  return timerContainer.appendChild(document.createElement('div'));
}

function showBombsCounter(bombsCounter) {
  const bombsArr = bombsCounter.toString().split('');

  for (let i = 0; i < bombsArr.length; i++) {
    addDivIn('bomb-counter').classList.add('bomb-counter', `counter-value_${bombsArr[i]}`);
  }
}

function showBombsAndFlags(table, x, y) {
  const rows = tbody.children;
  const target = tbody.children[x].children[y];

  target.classList.add('bomb_clicked');

  for(let i = 0; i < table.length; i++) {
    for(let j = 0; j < table[i].length; j++) {
      if (isFlag(table, i, j) && !isBomb(table[i][j])) {
        getCellElement(i, j).classList.add('bad-flag');
        continue;
      }

      if (!isFlag(table, i, j) && isBomb(table[i][j])) {
        const cell = rows[i].children[j];

        cell.classList.add('bomb');
      }
    }
  }
}

function showCell(table, x, y) {
  const cell = getCellElement(x, y);

  cell.classList.add('value',`value_${table[x][y].value}`);
}

function openGroupCells(table, x, y) {
  let openedCells = 0;

  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i === x && j === y) continue;
      if (!cellExist(table, i, j)) continue;
      if (isOpened(table, i, j)) continue;

      openedCells += openCell(table, i, j);
      // if (table[i][j] !== 0) {
      //   cell.classList.add('value',`value_${table[i][j]}`);
      // }
      // if (table[i][j] === 0) {
      //   cell.classList.add('value',`value_0`);
      //   openGroupCells(table, i, j);
      // }
    }
  }

  return openedCells;
}


function getRandomNumber(from, to) {
  // Должна вернуть случайное число от 'from' до 'to'
  return Math.floor(Math.random() * (to - from + 1) + from);
}

function createMatrix(n, m) {
  // делаем матрицу
  return Array(n).fill(0).map(() => Array(m).fill(0).map(() => {
    return {
      value: 0,
      isOpened: false,
      hasFlag: false,
    };
  }));
}

function fillСells(table, row, column, n) {
  // закидываем матрицу бомбами
  for(let i = 0; i < n;) {

    const x = getRandomNumber(0, table.length - 1)
    const y = getRandomNumber(0, table[x].length - 1);
    const cell = table[x][y];

    if (table[row][column] === table[x][y]) continue;

    
    if (!isBomb(cell)) {
      setBomb(cell);
      i++;
    }
  }
}



function isBomb(cell) {
  return cell.value === -1;
}

function setBomb(cell) {
  cell.value = -1;
}

function cellExist(table, x, y) {
  return table[x] && table[x][y] !== undefined;
}

function showCells(table) {
  const rows = tbody.children;

  for(let i = 0; i < table.length; i++) {
    for(let j = 0; j < table[i].length; j++) {
      const cell = rows[i].children[j];
      if (isBomb(table[i][j])) {
        cell.classList.add('bomb');
      } else {
        cell.classList.add('value',`value_${table[i][j]}`);
      }
    }
  }
}

function getCellElement(x, y) {
  return tbody.children[x].children[y];
}

function isFlag(table, x, y) {
  return table[x][y].hasFlag;
}

function losing() {
  button.classList.remove('smile', 'playing');

  button.classList.add('smile', 'defeat');
}

function isDefeat(table, x, y) {
  return table[x][y].value === -1 && table[x][y].isOpened === true;
}

function makeStartButton(button) {

  button.classList.add('smile', 'playing');
}

// ставим таймер
function startTimer(table, x, y) {
  let time = 1;
  

  let timerId = setInterval(() => {
    const divs = new Array(...timerContainer.children);

    let minutes = Math.round(time / 60).toString().padStart(2, '0').split('');
    let seconds = (time % 60).toString().padStart(2, '0').split('');

    for (let div of divs) {
      div.remove();
    }

    for (let i = 0; i < minutes.length; i++) {
      addDivInTimer().classList.add('timer', `counter-value_${minutes[i]}`);
    }

    addDivInTimer().classList.add('timer', 'counter-value_separator');

    for (let j = 0; j < seconds.length; j++) {
      addDivInTimer().classList.add('timer', `counter-value_${seconds[j]}`);
    }

    time++;
  }, 1000);

  return timerId;
}

/*________________________сейчас_______________________*/


function removeTableCells() {
  const tbodyElements = new Array(...tbody.children);

  for(let i = 0; i < tbodyElements.length; i++) {
    const tr = tbody.children[i];
    tds = new Array(...tr.children);

    for(let td of tds) {
      td.remove();
    }
  }

  for (let tr of tbodyElements) {
    tr.remove();
  }
}

function removeTimer() {
  const timerElements = new Array(...timer.children);

  for (let elem of timerElements) {
    elem.remove();
  }
}

function wining() {
  button.classList.remove('playing');

  button.classList.add('win');
}

function resetButton() {
  button.classList.remove('win', 'defeat');

  button.classList.add('playing');
}

function showFlags(table, x, y) {
  let bombsCounter = 0;
  const rows = tbody.children;
  const target = tbody.children[x].children[y];

  for(let i = 0; i < table.length; i++) {
    for(let j = 0; j < table[i].length; j++) {

      if (!isFlag(table, i, j) && isBomb(table[i][j])) {
        const cell = rows[i].children[j];

        cell.classList.add('flag');

        bombsCounter++;
      }
    }
  }

  return bombsCounter;
}
