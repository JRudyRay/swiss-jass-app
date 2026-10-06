import React, { useRef, useState } from 'react';
import YouTubePlayer from '../../YouTubePlayer';
import { messages, type Lang } from '../../i18n';
import CardValues from './CardValues';

const panel: React.CSSProperties = {
  background: '#fffaf0',
  border: '1px solid #fde2b6',
  borderRadius: 10,
  padding: '8px 12px',
};
const summary: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  color: '#3b2a14',
};
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
    <div
      style={{
        marginTop: 18,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <details style={{ ...panel, gridColumn: '1 / -1', padding: '10px 14px' }}>
        <summary style={summary}>{t.scoring}</summary>
        <CardValues lang={lang} />
      </details>
      <details
        style={panel}
        onToggle={(e) => setMusicOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary style={summary}>{t.music}</summary>
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
