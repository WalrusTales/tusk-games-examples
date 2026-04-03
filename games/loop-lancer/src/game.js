const lanes = ['North', 'East', 'South', 'West'];

const laneGrid = document.querySelector('[data-lanes]');
const lanePicker = document.querySelector('[data-lane-picker]');
const scoreValue = document.querySelector('[data-score]');
const integrityValue = document.querySelector('[data-integrity]');
const waveValue = document.querySelector('[data-wave]');
const trailValue = document.querySelector('[data-trail]');
const lastWaveValue = document.querySelector('[data-last-wave]');
const statusValue = document.querySelector('[data-status]');
const dashButton = document.querySelector('[data-dash]');
const resetButton = document.querySelector('[data-reset]');

let selectedLane = 0;
let wave = 1;
let score = 0;
let integrity = 5;
let activeTrailLane = null;
let lastDroneLane = null;

function randomLane() {
  return Math.floor(Math.random() * lanes.length);
}

function renderArena() {
  laneGrid.innerHTML = '';

  for (let index = 0; index < lanes.length; index += 1) {
    const lane = document.createElement('div');
    lane.className = 'lane-tile';
    lane.dataset.selected = String(index === selectedLane);
    lane.dataset.trail = String(index === activeTrailLane);
    lane.dataset.drone = String(index === lastDroneLane);
    lane.innerHTML = `
      <span class="lane-label">${lanes[index]}</span>
      <strong>${index === lastDroneLane ? 'Drone' : index === activeTrailLane ? 'Trail' : 'Clear'}</strong>
    `;
    laneGrid.append(lane);
  }

  scoreValue.textContent = String(score);
  integrityValue.textContent = String(integrity);
  waveValue.textContent = String(wave);
  trailValue.textContent =
    activeTrailLane === null
      ? 'Trail: none'
      : `Trail: ${lanes[activeTrailLane]}`;
  lastWaveValue.textContent =
    lastDroneLane === null
      ? 'Last wave: no drones yet'
      : `Last wave: drone breached from ${lanes[lastDroneLane]}`;
  dashButton.disabled = integrity <= 0;
}

function renderPicker() {
  lanePicker.innerHTML = '';

  for (let index = 0; index < lanes.length; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lane-button';
    if (index === selectedLane) {
      button.dataset.active = 'true';
    }
    button.textContent = lanes[index];
    button.addEventListener('click', () => {
      selectedLane = index;
      render();
    });
    lanePicker.append(button);
  }
}

function render() {
  renderArena();
  renderPicker();
}

function dash() {
  if (integrity <= 0) {
    return;
  }

  const droneLane = randomLane();
  const hit = droneLane === selectedLane || droneLane === activeTrailLane;

  lastDroneLane = droneLane;

  if (hit) {
    score += 1;
    statusValue.textContent = `Clean hit. ${lanes[droneLane]} collapsed into the trail.`;
  } else {
    integrity -= 1;
    statusValue.textContent = `Breach on ${lanes[droneLane]}. The arena shell took damage.`;
  }

  activeTrailLane = selectedLane;
  wave += 1;

  if (integrity <= 0) {
    statusValue.textContent =
      'Run over. Reset and try to chain trails for a longer score streak.';
  }

  render();
}

function resetRun() {
  selectedLane = 0;
  wave = 1;
  score = 0;
  integrity = 5;
  activeTrailLane = null;
  lastDroneLane = null;
  statusValue.textContent = 'Fresh arena. Pick a lane and start dashing again.';
  render();
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    selectedLane = (selectedLane + 1) % lanes.length;
    render();
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    selectedLane = (selectedLane - 1 + lanes.length) % lanes.length;
    render();
  }

  if (event.code === 'Space') {
    event.preventDefault();
    dash();
  }
});

dashButton.addEventListener('click', dash);
resetButton.addEventListener('click', resetRun);

render();
