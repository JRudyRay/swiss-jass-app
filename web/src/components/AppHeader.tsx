import React, { useState } from 'react';
import logo from '../assets/logo.png';
import Icon, { type IconName } from './Icon';
import './AppHeader.css';
import { LANGS, messages, type Lang } from '../i18n';

export type View = 'dashboard' | 'game' | 'tables' | 'rankings' | 'friends';

interface AppHeaderProps {
  user: any | null;
  onLogout: () => void;
  onSignIn: () => void;
  currentView: View;
  onViewChange: (view: View) => void;
  online: boolean;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onLogout,
  onSignIn,
  currentView,
  onViewChange,
  online,
  lang,
  onLangChange,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const t = messages(lang).header;

  // Online views only make sense with a backend and an account.
  const navItems: { id: View; label: string; icon: IconName }[] = [
    { id: 'game', label: t.play, icon: 'play' },
  ];
  if (online && user) {
    navItems.push(
      { id: 'dashboard', label: t.home, icon: 'home' },
      { id: 'tables', label: t.tables, icon: 'table' },
      { id: 'rankings', label: t.rankings, icon: 'trophy' },
      { id: 'friends', label: t.friends, icon: 'friends' },
    );
  }

  const current = LANGS.find((l) => l.code === lang);
  const hasNav = navItems.length > 1;

  return (
    <header className="app-header" data-view={currentView} data-tabs={hasNav ? 'true' : undefined}>
      <div className="app-header__inner">
        <button className="app-brand" onClick={() => onViewChange('game')} aria-label="Swiss Jass">
          <img src={logo} alt="" className="app-brand__logo" />
          <span className="app-brand__text">
            <span className="app-brand__title">Swiss Jass</span>
            <span className="app-brand__sub">{t.subtitle}</span>
          </span>
        </button>

        {hasNav && (
          <nav className="app-nav" aria-label="Swiss Jass">
            {navItems.map((item) => (
              <button
                key={item.id}
                className="app-nav__btn"
                aria-current={currentView === item.id ? 'page' : undefined}
                onClick={() => onViewChange(item.id)}
              >
                <Icon name={item.icon} size={20} />
                <span className="app-nav__label">{item.label}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="app-actions">
          <label className="app-lang">
            <Icon name="globe" size={18} />
            <span className="app-lang__code">{current?.short}</span>
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as Lang)}
              aria-label={t.language}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.short} · {l.label}
                </option>
              ))}
            </select>
          </label>

          {online && !user && (
            <button className="app-signin" onClick={onSignIn}>
              {t.signIn}
            </button>
          )}

          {user && (
            <div className="app-user">
              <button
                className="app-user__btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label={user.username}
                aria-expanded={showUserMenu}
              >
                <span className="app-user__avatar">{user.username?.[0]?.toUpperCase() || '?'}</span>
              </button>
              {showUserMenu && (
                <div className="app-user__menu">
                  <div className="app-user__name">{user.username}</div>
                  <button
                    className="app-user__item"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                  >
                    <Icon name="logout" size={18} />
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
