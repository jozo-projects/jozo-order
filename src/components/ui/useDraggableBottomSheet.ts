import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

const CLOSE_DRAG_DISTANCE = 120;
const CLOSE_DRAG_VELOCITY = 0.7;

interface UseDraggableBottomSheetOptions {
  onClose: () => void;
  disabled?: boolean;
}

type DragState = {
  active: boolean;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
};

export function useDraggableBottomSheet({
  onClose,
  disabled = false,
}: UseDraggableBottomSheetOptions) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragYRef = useRef(0);
  const dragStateRef = useRef<DragState>({
    active: false,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  });

  function endDrag() {
    const dragState = dragStateRef.current;
    if (!dragState.active) return;

    dragState.active = false;
    setIsDragging(false);

    if (
      dragYRef.current >= CLOSE_DRAG_DISTANCE ||
      dragState.velocity >= CLOSE_DRAG_VELOCITY
    ) {
      dragYRef.current = 0;
      setDragY(0);
      setHasDragged(false);
      onClose();
      return;
    }

    dragYRef.current = 0;
    setDragY(0);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const now = performance.now();
    dragStateRef.current = {
      active: true,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: now,
      velocity: 0,
    };
    setHasDragged(true);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;
    if (!dragState.active) return;

    const now = performance.now();
    const elapsed = Math.max(now - dragState.lastTime, 1);
    const velocity = (event.clientY - dragState.lastY) / elapsed;
    const nextDragY = Math.max(event.clientY - dragState.startY, 0);

    dragState.lastY = event.clientY;
    dragState.lastTime = now;
    dragState.velocity = velocity;
    dragYRef.current = nextDragY;
    setDragY(nextDragY);
  }

  const sheetStyle: CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging
      ? "none"
      : "transform 180ms cubic-bezier(0.32, 0.72, 0, 1)",
    willChange: "transform",
  };

  return {
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      className: "touch-none select-none cursor-grab active:cursor-grabbing",
    },
    hasDragged,
    isDragging,
    sheetStyle,
  };
}
