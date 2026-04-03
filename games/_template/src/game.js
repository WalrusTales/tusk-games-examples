const scoreValue = document.querySelector('[data-score]');
const statusValue = document.querySelector('[data-status]');
const actionButton = document.querySelector('[data-action]');
const resetButton = document.querySelector('[data-reset]');

let score = 0;

function render() {
  scoreValue.textContent = String(score);
  statusValue.textContent =
    score === 0
      ? 'Click the button or press Space to test the basic interaction loop.'
      : `Nice. The template is alive with a score of ${score}.`;
}

function incrementScore() {
  score += 1;
  render();
}

function resetScore() {
  score = 0;
  render();
}

actionButton.addEventListener('click', incrementScore);
resetButton.addEventListener('click', resetScore);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    incrementScore();
  }
});

render();
