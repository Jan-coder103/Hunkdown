import { mountApp } from './app';

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('Missing application root');
const mountedApp = mountApp(appRoot);
if (import.meta.hot) import.meta.hot.dispose(() => mountedApp.dispose());
