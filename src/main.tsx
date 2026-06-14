import ReactDOM from 'react-dom/client';
import App from './App';
import { RotatePrompt } from './components/RotatePrompt';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <RotatePrompt />
  </>,
);
