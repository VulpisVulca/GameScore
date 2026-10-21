import { loadSession } from './persistence.js';
import { bindEvents } from './events.js';
import { render } from './ui/render.js';
import { registerOffline } from './offline.js';

loadSession();
bindEvents();
render();
registerOffline();
