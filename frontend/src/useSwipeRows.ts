import { useRef, useState } from 'react';

const SWIPE_ACTIONS_WIDTH = 160;
const SWIPE_OPEN_THRESHOLD = 50;
const TAP_THRESHOLD = 8;

interface DragState {
  id: string;
  startX: number;
  startY: number;
  deltaX: number;
  wasOpen: boolean;
  locked: 'horizontal' | 'vertical' | null;
}

/**
 * Deslizar una fila a la izquierda para mostrar sus acciones (Editar /
 * Eliminar), tocarla para abrirla. Compartido entre la lista de
 * movimientos/avisos y la de Aportes personales. Solo una fila abierta a la
 * vez: tocar cualquier fila con otra abierta la cierra en vez de abrir el
 * detalle.
 */
export function useSwipeRows(puedeEditar: boolean) {
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [, forceRender] = useState(0);

  function handlePointerDown(e: React.PointerEvent, id: string) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      deltaX: 0,
      wasOpen: openSwipeId === id,
      locked: null,
    };
  }

  function handlePointerMove(e: React.PointerEvent, id: string) {
    const drag = dragRef.current;
    if (!drag || drag.id !== id) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.locked = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (drag.locked !== 'horizontal') return;

    drag.deltaX = dx;
    forceRender((n) => n + 1);
  }

  function handlePointerUp(id: string, onTap: () => void) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== id) return;

    // Nunca llegó a moverse lo suficiente como para "trabar" una dirección
    // (locked sigue null) — eso es un tap real, no un intento de swipe.
    if (drag.locked === null || (drag.locked === 'horizontal' && Math.abs(drag.deltaX) < TAP_THRESHOLD)) {
      if (openSwipeId) {
        setOpenSwipeId(null);
      } else {
        onTap();
      }
      forceRender((n) => n + 1);
      return;
    }

    if (drag.locked !== 'horizontal') {
      forceRender((n) => n + 1);
      return;
    }

    if (drag.deltaX < -SWIPE_OPEN_THRESHOLD && puedeEditar) {
      setOpenSwipeId(id);
    } else if (drag.deltaX > SWIPE_OPEN_THRESHOLD) {
      setOpenSwipeId(null);
    } else {
      setOpenSwipeId(drag.wasOpen ? id : null);
    }
    forceRender((n) => n + 1);
  }

  function rowTransform(id: string): number {
    const drag = dragRef.current;
    const base = openSwipeId === id ? -SWIPE_ACTIONS_WIDTH : 0;
    if (drag && drag.id === id && drag.locked === 'horizontal') {
      const start = drag.wasOpen ? -SWIPE_ACTIONS_WIDTH : 0;
      return Math.min(0, Math.max(-SWIPE_ACTIONS_WIDTH, start + drag.deltaX));
    }
    return base;
  }

  /** Props para la tarjeta que se desliza (va adentro de un .swipe-row, al lado de .swipe-actions). */
  function cardProps(id: string, onTap: () => void, extraStyle?: React.CSSProperties) {
    return {
      style: {
        ...extraStyle,
        transform: `translateX(${rowTransform(id)}px)`,
        transition: dragRef.current?.id === id ? 'none' : undefined,
      },
      onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, id),
      onPointerMove: (e: React.PointerEvent) => handlePointerMove(e, id),
      onPointerUp: () => handlePointerUp(id, onTap),
      onPointerCancel: () => {
        dragRef.current = null;
        forceRender((n) => n + 1);
      },
    };
  }

  return { cardProps, closeSwipe: () => setOpenSwipeId(null) };
}
