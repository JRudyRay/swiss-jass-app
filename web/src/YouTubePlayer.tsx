import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

type Props = {
  playlistId: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
};

const YouTubePlayer = forwardRef((props: Props, ref) => {
  const { playlistId, width = 320, height = 200, autoplay = false } = props;
  const containerId = useRef('yt-player-' + Math.random().toString(36).slice(2,9));
  const playerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    next: () => playerRef.current?.nextVideo(),
    prev: () => playerRef.current?.previousVideo(),
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
  }));

  useEffect(() => {
    // Load YouTube Iframe API if not present
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const onAPIReady = () => {
      if (!(window as any).YT) return;
      playerRef.current = new (window as any).YT.Player(containerId.current, {
        height: String(height),
        width: String(width),
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          autoplay: autoplay ? 1 : 0,
          controls: 1,
        },
        events: {
          onReady: (e: any) => {
            // nothing
          }
        }
      });
    };

    // If API already loaded
    if ((window as any).YT && (window as any).YT.Player) onAPIReady();
    // Otherwise a global callback YouTube sets
    (window as any).onYouTubeIframeAPIReady = onAPIReady;

    return () => {
      try { playerRef.current?.destroy(); } catch(e){}
    };
  }, [playlistId, width, height, autoplay]);

  return (
    <div style={{ width, height }}>
      <div id={containerId.current}></div>
    </div>
  );
});

export default YouTubePlayer;
