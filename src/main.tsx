import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LocaleProvider } from './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <LocaleProvider>
    <App />
  </LocaleProvider>,
);
