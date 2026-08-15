const navToggle = document.querySelector('.nav-toggle');
const mobileNav = document.querySelector('.mobile-nav');

function closeMobileNav() {
  document.body.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
  mobileNav.setAttribute('aria-hidden', 'true');
}

function openMobileNav() {
  document.body.classList.add('nav-open');
  navToggle.setAttribute('aria-expanded', 'true');
  mobileNav.setAttribute('aria-hidden', 'false');
}

navToggle.addEventListener('click', () => {
  const isOpen = document.body.classList.contains('nav-open');
  isOpen ? closeMobileNav() : openMobileNav();
});

mobileNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMobileNav);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});
