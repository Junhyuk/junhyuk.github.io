const filterButtons = document.querySelectorAll('.filter-button');
const appCards = document.querySelectorAll('.app-card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    appCards.forEach((card) => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !show);
    });
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
