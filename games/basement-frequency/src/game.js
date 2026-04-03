const rooms = ['Boiler', 'Storage', 'Studio'];

const roomGrid = document.querySelector('[data-rooms]');
const stabilityValue = document.querySelector('[data-stability]');
const nightValue = document.querySelector('[data-night]');
const barricadeValue = document.querySelector('[data-barricade]');
const statusValue = document.querySelector('[data-status]');
const pulseButton = document.querySelector('[data-pulse]');
const advanceButton = document.querySelector('[data-advance]');
const resetButton = document.querySelector('[data-reset]');

let threatRoomIndex = 0;
let barricadedRoomIndex = null;
let stability = 3;
let night = 1;
let revealIndex = null;
let pulseLocked = false;
let pulseTimeoutId = null;

function randomRoom() {
  return Math.floor(Math.random() * rooms.length);
}

function clearPulseTimeout() {
  if (pulseTimeoutId === null) {
    return;
  }

  window.clearTimeout(pulseTimeoutId);
  pulseTimeoutId = null;
}

function render() {
  roomGrid.innerHTML = '';

  for (let index = 0; index < rooms.length; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'room-card';
    button.dataset.selected = String(index === barricadedRoomIndex);
    button.dataset.revealed = String(index === revealIndex);
    button.innerHTML = `
      <span class="label">${rooms[index]}</span>
      <strong>${index === revealIndex ? 'Signal found' : 'Silent'}</strong>
    `;
    button.addEventListener('click', () => {
      barricadedRoomIndex = index;
      barricadeValue.textContent = rooms[index];
      statusValue.textContent = `Barricade set on ${rooms[index]}. Hold until dawn.`;
      render();
    });
    roomGrid.append(button);
  }

  stabilityValue.textContent = String(stability);
  nightValue.textContent = String(night);
  if (barricadedRoomIndex === null) {
    barricadeValue.textContent = 'None';
  }

  pulseButton.disabled = pulseLocked || stability <= 0;
  advanceButton.disabled = stability <= 0;
}

function pulseRadio() {
  if (pulseLocked || stability <= 0) {
    return;
  }

  clearPulseTimeout();
  pulseLocked = true;
  revealIndex = threatRoomIndex;
  statusValue.textContent = `Pulse returned from ${rooms[threatRoomIndex]}. Move fast.`;
  render();

  pulseTimeoutId = window.setTimeout(() => {
    pulseTimeoutId = null;
    revealIndex = null;
    statusValue.textContent =
      'The signal vanished again. Trust the pulse or make a risky read.';
    render();
  }, 1200);
}

function advanceNight() {
  if (stability <= 0) {
    return;
  }

  clearPulseTimeout();
  const held = barricadedRoomIndex === threatRoomIndex;

  if (held) {
    statusValue.textContent =
      'The barricade held through the static. You bought one more night.';
  } else {
    stability -= 1;
    statusValue.textContent =
      'Something slipped through the dark. The basement lost stability.';
  }

  night += 1;
  barricadedRoomIndex = null;
  revealIndex = null;
  pulseLocked = false;
  threatRoomIndex = randomRoom();

  if (stability <= 0) {
    statusValue.textContent =
      'The frequency collapsed. Reset the run and try a calmer sequence.';
  }

  render();
}

function resetGame() {
  clearPulseTimeout();
  threatRoomIndex = randomRoom();
  barricadedRoomIndex = null;
  stability = 3;
  night = 1;
  revealIndex = null;
  pulseLocked = false;
  statusValue.textContent =
    'The radio is quiet again. Pulse once, then choose a room to hold.';
  render();
}

pulseButton.addEventListener('click', pulseRadio);
advanceButton.addEventListener('click', advanceNight);
resetButton.addEventListener('click', resetGame);

resetGame();
