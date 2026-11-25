/**
 * Stands in for the browser's popover API, which happy-dom and jsdom lack, as far as the menus use it:
 * `showPopover`, `hidePopover`, `togglePopover` and `matches(":popover-open")` on every element; a `beforetoggle`
 * dispatched at once, cancelable on opening, and a `toggle` a task later, coalesced as the browser does; a
 * `button[popovertarget]` toggling its popover once a click's listeners have run, unless one cancelled it; an
 * auto popover hiding the open ones that are not its ancestors as it shows, and its open descendants as it hides;
 * and Escape hiding the topmost.
 * @param {Document} doc
 * @returns {() => void} removes the stand-in and forgets every open popover
 */
export function installPopovers(doc) {
  const win = doc.defaultView;
  const proto = win.HTMLElement.prototype;
  const saved = new Map(["showPopover", "hidePopover", "togglePopover", "matches"].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)]));
  const matches = win.Element.prototype.matches;
  const stack = [];
  const hiding = new Set();
  const pending = new Map();

  const isOpen = (el) => stack.includes(el);

  function fire(el, type, oldState, newState, cancelable) {
    const event = new win.Event(type, { cancelable });
    Object.assign(event, { oldState, newState });
    return el.dispatchEvent(event);
  }

  function toggleLater(el, oldState, newState) {
    const queued = pending.get(el);
    if (queued) win.clearTimeout(queued.timer);
    const from = queued ? queued.oldState : oldState;
    const timer = win.setTimeout(() => {
      pending.delete(el);
      fire(el, "toggle", from, newState, false);
    });
    pending.set(el, { timer, oldState: from });
  }

  function check(el) {
    if (!el.hasAttribute("popover")) throw new win.DOMException("Not a popover", "NotSupportedError");
    if (!el.isConnected) throw new win.DOMException("Not in the document", "InvalidStateError");
  }

  function show(el) {
    check(el);
    if (isOpen(el)) return;
    if (!fire(el, "beforetoggle", "closed", "open", true) || isOpen(el)) return;
    for (const other of [...stack].reverse()) if (!other.contains(el)) hide(other);
    stack.push(el);
    toggleLater(el, "closed", "open");
  }

  function hide(el) {
    if (!isOpen(el) || hiding.has(el)) return;
    hiding.add(el);
    try {
      for (const other of [...stack].reverse()) if (other !== el && el.contains(other)) hide(other);
      fire(el, "beforetoggle", "open", "closed", false);
    } finally {
      hiding.delete(el);
    }
    const at = stack.indexOf(el);
    if (at < 0) return;
    stack.splice(at, 1);
    toggleLater(el, "open", "closed");
  }

  Object.defineProperties(proto, {
    showPopover: {
      configurable: true,
      value() {
        show(this);
      },
    },
    hidePopover: {
      configurable: true,
      value() {
        check(this);
        hide(this);
      },
    },
    togglePopover: {
      configurable: true,
      value(force) {
        if (force === undefined ? !isOpen(this) : force) show(this);
        else {
          check(this);
          hide(this);
        }
        return isOpen(this);
      },
    },
    matches: {
      configurable: true,
      value(selector) {
        return selector === ":popover-open" ? isOpen(this) : matches.call(this, selector);
      },
    },
  });

  const onClick = (event) => {
    const button = event.target?.closest?.("button[popovertarget]");
    if (!button || event.defaultPrevented) return;
    const target = button.getRootNode().getElementById(button.getAttribute("popovertarget"));
    if (!target?.hasAttribute("popover")) return;
    const action = button.getAttribute("popovertargetaction") ?? "toggle";
    if (action === "show" || (action === "toggle" && !isOpen(target))) show(target);
    else hide(target);
  };

  const onKeydown = (event) => {
    if (event.key === "Escape" && !event.defaultPrevented && stack.length) hide(stack.at(-1));
  };

  doc.addEventListener("click", onClick);
  doc.addEventListener("keydown", onKeydown);

  return () => {
    doc.removeEventListener("click", onClick);
    doc.removeEventListener("keydown", onKeydown);
    for (const { timer } of pending.values()) win.clearTimeout(timer);
    pending.clear();
    stack.length = 0;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else Reflect.deleteProperty(proto, name);
    }
  };
}
