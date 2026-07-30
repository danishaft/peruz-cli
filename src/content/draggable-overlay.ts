export type DraggableOverlay = {
  consumeDraggedClick: () => boolean;
  destroy: () => void;
};

type DragState = {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  startLeft: number;
  startTop: number;
  width: number;
  height: number;
  moved: boolean;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

/**
 * Makes a fixed overlay draggable while keeping it inside the viewport.
 */
export function makeViewportDraggable(
  element: HTMLElement,
  options: { padding?: number; threshold?: number } = {},
): DraggableOverlay {
  const view = element.ownerDocument.defaultView ?? window;
  const padding = options.padding ?? 8;
  const threshold = options.threshold ?? 4;
  let drag: DragState | null = null;
  let suppressClickUntil = 0;

  function position(left: number, top: number, width: number, height: number): void {
    element.style.left = `${Math.round(clamp(left, padding, view.innerWidth - width - padding))}px`;
    element.style.top = `${Math.round(clamp(top, padding, view.innerHeight - height - padding))}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  }

  function keepInsideViewport(): void {
    const rect = element.getBoundingClientRect();
    position(rect.left, rect.top, rect.width, rect.height);
  }

  function finishDrag(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    suppressClickUntil = drag.moved ? view.performance.now() + 500 : 0;
    drag = null;
    element.dataset.dragging = "false";
    element.style.cursor = "grab";
    view.removeEventListener("pointermove", onPointerMove, true);
    view.removeEventListener("pointerup", finishDrag, true);
    view.removeEventListener("pointercancel", finishDrag, true);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < threshold) return;

    drag.moved = true;
    event.preventDefault();
    position(drag.startLeft + deltaX, drag.startTop + deltaY, drag.width, drag.height);
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || drag) return;
    const rect = element.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    element.dataset.dragging = "true";
    element.style.cursor = "grabbing";
    view.addEventListener("pointermove", onPointerMove, true);
    view.addEventListener("pointerup", finishDrag, true);
    view.addEventListener("pointercancel", finishDrag, true);
  }

  element.style.cursor = "grab";
  element.style.touchAction = "none";
  element.style.userSelect = "none";
  element.addEventListener("pointerdown", onPointerDown);
  view.addEventListener("resize", keepInsideViewport);

  return {
    consumeDraggedClick() {
      const dragged = view.performance.now() <= suppressClickUntil;
      suppressClickUntil = 0;
      return dragged;
    },
    destroy() {
      element.removeEventListener("pointerdown", onPointerDown);
      view.removeEventListener("pointermove", onPointerMove, true);
      view.removeEventListener("pointerup", finishDrag, true);
      view.removeEventListener("pointercancel", finishDrag, true);
      view.removeEventListener("resize", keepInsideViewport);
    },
  };
}
