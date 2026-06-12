import './style.css';
import { mountShell } from '@ui/shell';
import { attachCanvasSurface, type CanvasSurface } from '@render/canvas';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('#app root element not found');

const shell = mountShell(root);

// Placeholder paint until the planet renderer lands in M2. Confirms the canvas
// surface sizes correctly to its container across resizes and DPR.
function drawPlaceholder(s: CanvasSurface): void {
  const { ctx, width, height } = s;
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#7d8aa0';
  ctx.font = '14px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('planet renderer — M2', width / 2, height / 2);
}

attachCanvasSurface(shell.canvas, drawPlaceholder);
