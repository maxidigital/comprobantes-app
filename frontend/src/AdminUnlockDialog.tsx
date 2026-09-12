import { FormEvent, useState } from 'react';
import { setAdminKey } from './api';

interface Props {
  onUnlocked: () => void;
  onClose: () => void;
  errorMessage?: string | null;
}

/**
 * There's no side-effect-free way to check the admin password ahead of
 * time (every mutating endpoint requires it) — so this just stores
 * whatever is typed and lets the real action fail with a clear error if
 * it's wrong, rather than adding a dedicated verification endpoint.
 */
export default function AdminUnlockDialog({ onUnlocked, onClose, errorMessage }: Props) {
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setAdminKey(password.trim());
    onUnlocked();
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Modo administrador</h2>
        <div className="field">
          <label htmlFor="admin-password">Contraseña de administrador</label>
          <input
            id="admin-password"
            className="input"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-solid">
            Continuar
          </button>
        </div>
      </form>
    </div>
  );
}
