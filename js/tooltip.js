document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.dynamic-tooltip');

  links.forEach(link => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = 'Kliknij mnie!';
    document.body.appendChild(tooltip);

    const setTooltipPosition = () => {
      const linkRect = link.getBoundingClientRect();
      tooltip.style.left = `${linkRect.left + window.scrollX + linkRect.width / 2 - tooltip.offsetWidth / 2}px`;
      tooltip.style.top = `${linkRect.top + window.scrollY - tooltip.offsetHeight - 0}px`;
    };

    const animateTooltip = () => {
      setTooltipPosition();
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';

      setTimeout(() => {
        tooltip.style.animation = 'shake 1s forwards';
      }, 1000);

      setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        setTimeout(() => {
          tooltip.style.animation = 'none';
        }, 500);
      }, 2000);
    };

    animateTooltip();
    setInterval(animateTooltip, Math.random() * (30000 - 20000) + 20000);
  });
});
