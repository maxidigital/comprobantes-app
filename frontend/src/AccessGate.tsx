import { FormEvent, useState } from 'react';
import { setAccessKey, setUserName, tryAccessKey } from './api';

interface Props {
  onUnlock: () => void;
}

export default function AccessGate({ onUnlock }: Props) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const ok = await tryAccessKey(password.trim());
      if (ok) {
        setAccessKey(password.trim());
        setUserName(name.trim());
        onUnlock();
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate">
      <form className="card gate-card" onSubmit={handleSubmit}>
        <h1>Comprobantes</h1>
        <p>Administración de la sucesión</p>
        <div className="field">
          <label htmlFor="user-name">Tu nombre</label>
          <input
            id="user-name"
            className="input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label htmlFor="access-password">Contraseña de acceso</label>
          <input
            id="access-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-solid" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
