export interface Session {
    username: string;
    loginAt: string;
  }
  
  const KEY = "snapp.session";
  
  export function saveSession(username: string): Session {
    const session: Session = { username, loginAt: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(session)); } catch {}
    return session;
  }
  
  export function readSession(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.username ? (parsed as Session) : null;
    } catch {
      return null;
    }
  }
  
  export function clearSession(): void {
    try { localStorage.removeItem(KEY); } catch {}
  }