import React from 'react';

const L = {
  en: {
    title: 'The cards',
    body: 'Swiss-German deck printed around 1850 in Hasle bei Burgdorf. Scans: Bibliothèque nationale de France, public domain:',
  },
  ch: {
    title: 'D Charte',
    body: 'Dütschschwizer Jasscharte, druckt um 1850 z Hasle bi Burgdorf. Scans: Bibliothèque nationale de France, gmeinfrei:',
  },
};

const CardCredits: React.FC<{ lang: 'en' | 'ch' }> = ({ lang }) => {
  const t = L[lang] || L.en;
  return (
    <div style={{
      marginTop: 24, padding: '12px 16px', background: '#f3f4f6', borderRadius: 8,
      border: '1px solid #d1d5db', fontSize: 11, color: '#6b7280', lineHeight: 1.6, textAlign: 'center',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>{t.title}</div>
      <div>
        {t.body}{' '}
        <a href="https://commons.wikimedia.org/wiki/Category:Swiss_card_deck_-_1850" target="_blank" rel="noreferrer" style={{ color: '#4b5563' }}>
          Wikimedia Commons
        </a>
      </div>
    </div>
  );
};

export default CardCredits;
