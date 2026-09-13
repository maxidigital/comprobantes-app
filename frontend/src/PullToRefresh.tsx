import { ReactNode, TouchEvent, useRef, useState } from 'react';

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PULL_THRESHOLD = 70;
const MAX_PULL = 100;

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const dragStartY = useRef<number | null>(null);

  function atTop(): boolean {
    return (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;
  }

  function handleTouchStart(e: TouchEvent) {
    if (refreshing || !atTop()) return;
    dragStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: TouchEvent) {
    if (dragStartY.current === null) return;
    if (!atTop()) {
      dragStartY.current = null;
      setPullDistance(0);
      return;
    }
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.5, MAX_PULL));
    }
  }

  async function handleTouchEnd() {
    if (dragStartY.current === null) return;
    dragStartY.current = null;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }

  const dragging = dragStartY.current !== null;

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="pull-indicator"
        style={{ height: pullDistance, transition: dragging ? 'none' : undefined }}
      >
        {refreshing ? <span className="pull-spinner" /> : <span className="pull-arrow">↓</span>}
      </div>
      {children}
    </div>
  );
}
