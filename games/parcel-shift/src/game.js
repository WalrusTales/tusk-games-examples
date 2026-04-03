const destinations = ['Arcade Dock', 'Puzzle Dock', 'Prize Dock'];
const parcelTypes = [
  { label: 'Glow Carton', target: 'Arcade Dock', accent: 'gold' },
  { label: 'Logic Crate', target: 'Puzzle Dock', accent: 'cyan' },
  { label: 'Ribbon Box', target: 'Prize Dock', accent: 'rose' },
];

const laneBoard = document.querySelector('[data-lanes]');
const scoreValue = document.querySelector('[data-score]');
const missesValue = document.querySelector('[data-misses]');
const tickValue = document.querySelector('[data-tick]');
const statusValue = document.querySelector('[data-status]');
const runButton = document.querySelector('[data-run]');
const resetButton = document.querySelector('[data-reset]');

let lanes = [];
let score = 0;
let misses = 0;
let tick = 1;

function randomParcel() {
  return parcelTypes[Math.floor(Math.random() * parcelTypes.length)];
}

function seedLanes() {
  lanes = ['A', 'B', 'C'].map((name, index) => ({
    name,
    routeIndex: index,
    parcel: randomParcel(),
  }));
}

function cycleRoute(laneIndex) {
  const lane = lanes[laneIndex];
  lane.routeIndex = (lane.routeIndex + 1) % destinations.length;
  render();
}

function runTick() {
  let localScore = 0;
  let localMisses = 0;

  for (const lane of lanes) {
    const route = destinations[lane.routeIndex];

    if (route === lane.parcel.target) {
      localScore += 1;
      score += 1;
    } else {
      localMisses += 1;
      misses += 1;
    }

    lane.parcel = randomParcel();
  }

  statusValue.textContent =
    localMisses === 0
      ? 'Clean dispatch. Every parcel hit the right dock.'
      : `Tick complete. ${localScore} correct, ${localMisses} rerouted by hand.`;

  tick += 1;
  render();
}

function resetFloor() {
  score = 0;
  misses = 0;
  tick = 1;
  seedLanes();
  statusValue.textContent =
    'Fresh queue loaded. Tune the switches before the next tick.';
  render();
}

function render() {
  laneBoard.innerHTML = '';

  for (let index = 0; index < lanes.length; index += 1) {
    const lane = lanes[index];
    const article = document.createElement('article');
    article.className = 'lane-card';
    article.innerHTML = `
      <div class="lane-header">
        <p class="label">Lane ${lane.name}</p>
        <button type="button" class="route-button" data-route-index="${index}">
          Route to ${destinations[lane.routeIndex]}
        </button>
      </div>
      <div class="parcel-card parcel-${lane.parcel.accent}">
        <span class="label">Incoming Parcel</span>
        <strong>${lane.parcel.label}</strong>
        <p>Target dock: ${lane.parcel.target}</p>
      </div>
    `;
    laneBoard.append(article);
  }

  for (const button of laneBoard.querySelectorAll('[data-route-index]')) {
    button.addEventListener('click', () => {
      cycleRoute(Number(button.getAttribute('data-route-index')));
    });
  }

  scoreValue.textContent = String(score);
  missesValue.textContent = String(misses);
  tickValue.textContent = String(tick);
}

runButton.addEventListener('click', runTick);
resetButton.addEventListener('click', resetFloor);

seedLanes();
render();
