const animals = [
  {
    name: 'Elephant',
    rule: 'Heavy fruit belongs on the bottom, soft berries on top.',
    target: ['melon', 'banana', 'berry'],
  },
  {
    name: 'Monkey',
    rule: 'Build from fastest snack to slowest snack.',
    target: ['banana', 'berry', 'melon'],
  },
  {
    name: 'Giraffe',
    rule: 'Tall stacks start with the smallest bite and end with the widest.',
    target: ['berry', 'banana', 'melon'],
  },
];

const snacks = [
  { id: 'melon', label: 'Melon Wheel' },
  { id: 'banana', label: 'Banana Curl' },
  { id: 'berry', label: 'Berry Cluster' },
];

const animalName = document.querySelector('[data-animal-name]');
const ruleText = document.querySelector('[data-rule-text]');
const targetText = document.querySelector('[data-target-text]');
const scoreValue = document.querySelector('[data-score]');
const roundValue = document.querySelector('[data-round]');
const stackSlots = document.querySelector('[data-stack-slots]');
const snackGrid = document.querySelector('[data-snack-grid]');
const statusValue = document.querySelector('[data-status]');
const clearButton = document.querySelector('[data-clear]');
const checkButton = document.querySelector('[data-check]');
const nextButton = document.querySelector('[data-next]');

let animalIndex = 0;
let round = 1;
let score = 0;
let selection = [];
let roundResolved = false;

function currentAnimal() {
  return animals[animalIndex];
}

function renderSnackButtons() {
  snackGrid.innerHTML = '';

  for (const snack of snacks) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'snack-button';
    button.textContent = snack.label;
    button.addEventListener('click', () => addSnack(snack.id));
    snackGrid.append(button);
  }
}

function updateSnackButtons() {
  const snackButtons = snackGrid.querySelectorAll('button');
  const disabled = selection.length >= 3 || roundResolved;

  for (const button of snackButtons) {
    button.disabled = disabled;
  }
}

function renderStack() {
  stackSlots.innerHTML = '';

  for (let index = 0; index < 3; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'slot';

    if (selection[index] !== undefined) {
      const snack = snacks.find((item) => item.id === selection[index]);
      slot.textContent = snack?.label ?? selection[index];
      slot.dataset.filled = 'true';
    } else {
      slot.textContent = `Slot ${index + 1}`;
      slot.dataset.filled = 'false';
    }

    stackSlots.append(slot);
  }

  clearButton.disabled = selection.length === 0 || roundResolved;
  checkButton.disabled = selection.length !== 3 || roundResolved;
  updateSnackButtons();
}

function renderMeta() {
  const animal = currentAnimal();

  animalName.textContent = animal.name;
  ruleText.textContent = animal.rule;
  targetText.textContent = `Target order: ${animal.target
    .map((id) => snacks.find((snack) => snack.id === id)?.label ?? id)
    .join(' -> ')}`;
  scoreValue.textContent = String(score);
  roundValue.textContent = String(round);
}

function render() {
  renderMeta();
  renderStack();
}

function addSnack(snackId) {
  if (roundResolved) {
    statusValue.textContent =
      'That guide is already impressed. Pick the next guide.';
    return;
  }

  if (selection.length >= 3) {
    statusValue.textContent = 'The stack is full. Clear it or check it first.';
    return;
  }

  selection.push(snackId);
  statusValue.textContent =
    'Nice. Keep stacking until you fill all three slots.';
  renderStack();
}

function clearSelection() {
  if (roundResolved) {
    statusValue.textContent = 'Take the badge and move to the next guide.';
    return;
  }

  selection = [];
  statusValue.textContent = 'The stack is clear. Try another order.';
  render();
}

function nextAnimal() {
  animalIndex = (animalIndex + 1) % animals.length;
  round += 1;
  selection = [];
  roundResolved = false;
  statusValue.textContent = 'New guide, new rule. Build a fresh snack tower.';
  render();
}

function checkSelection() {
  if (roundResolved) {
    return;
  }

  const target = currentAnimal().target;
  const isCorrect =
    selection.length === target.length &&
    selection.every((value, index) => value === target[index]);

  if (isCorrect) {
    score += 1;
    roundResolved = true;
    statusValue.textContent =
      'Perfect stack. The guide hands you a shiny safari badge. Pick the next guide.';
  } else {
    statusValue.textContent =
      'Close, but the order is off. Clear the stack or switch guides.';
  }

  render();
}

clearButton.addEventListener('click', clearSelection);
checkButton.addEventListener('click', checkSelection);
nextButton.addEventListener('click', nextAnimal);

renderSnackButtons();
render();
