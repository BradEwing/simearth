// Application entry point. The full canvas + UI shell is assembled in M0.6;
// for now this just confirms the bundle boots.
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.textContent = 'SimEarth — booting…';
}
