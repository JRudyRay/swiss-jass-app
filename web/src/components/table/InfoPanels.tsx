import React, { useRef, useState } from 'react';
import YouTubePlayer from '../../YouTubePlayer';
import { messages, type Lang } from '../../i18n';
import CardValues from './CardValues';

const btn: React.CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

// Collapsed by default so the table stays the focus; the video only loads once opened.
export const InfoPanels: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = messages(lang).info;
  const yt = useRef<any>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  return (
    <div className="info-panels">
      <details className="info-panel info-panel--wide">
        <summary className="info-panel__summary">{t.scoring}</summary>
        <CardValues lang={lang} />
      </details>
      <details
        className="info-panel"
        onToggle={(e) => setMusicOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="info-panel__summary">{t.music}</summary>
        {musicOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <button style={{ ...btn, background: '#374151' }} onClick={() => yt.current?.prev()}>
                {t.prev}
              </button>
              <button style={{ ...btn, background: '#059669' }} onClick={() => yt.current?.play()}>
                {t.play}
              </button>
              <button style={{ ...btn, background: '#b91c1c' }} onClick={() => yt.current?.pause()}>
                {t.pause}
              </button>
              <button style={{ ...btn, background: '#111827' }} onClick={() => yt.current?.next()}>
                {t.next}
              </button>
            </div>
            <div style={{ borderRadius: 6, overflow: 'hidden', maxWidth: 280 }}>
              <YouTubePlayer
                ref={yt}
                playlistId={'PL4-gXKkSsfQpRt16x8SUGSz6wLk2Lyxdp'}
                width={280}
                height={175}
                autoplay={true}
              />
            </div>
          </div>
        )}
      </details>
    </div>
  );
};

export default InfoPanels;
