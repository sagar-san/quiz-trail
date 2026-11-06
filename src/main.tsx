import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createAppDependencies } from './app/createAppDependencies';
import './styles/index.css';

async function start() {
  const root = createRoot(document.getElementById('root')!);
  try {
    const dependencies = await createAppDependencies(import.meta.env);
    if (dependencies.certification?.id === 'agentic-ai') document.title = `${dependencies.certification.title} Practice | Quiz Trail`;
    root.render(<StrictMode><App {...dependencies} /></StrictMode>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz Trail could not start because its configuration is invalid.';
    root.render(<main className="centered-state error-state"><p className="eyebrow">Configuration error</p><h1>Quiz Trail can’t start</h1><p>{message}</p><a href="/">Back to certifications</a></main>);
  }
}

void start();
