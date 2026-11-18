import React, { useRef } from 'react';
import YouTubePlayer from '../../YouTubePlayer';
import { messages, type Lang } from '../../i18n';

// Mountain music: the YouTube player and its buttons. Mount it only while it is wanted, the
// embed loads (and starts playing) on mount.
const MusicPlayer: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = messages(lang).info;
  const yt = useRef<any>(null);
  const controls: [string, () => void][] = [
    [t.prev, () => yt.current?.prev()],
    [t.play, () => yt.current?.play()],
    [t.pause, () => yt.current?.pause()],
    [t.next, () => yt.current?.next()],
  ];
  return (
    <div className="music">
      <div className="music__controls">
        {controls.map(([label, run]) => (
          <button key={label} type="button" className="music__btn" onClick={run}>
            {label}
          </button>
        ))}
      </div>
      <div className="music__frame">
        <YouTubePlayer
          ref={yt}
          playlistId={'PL4-gXKkSsfQpRt16x8SUGSz6wLk2Lyxdp'}
          width={280}
          height={175}
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
