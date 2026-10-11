import { createSignal } from 'solid-js';

/** Proof island for FRT-8: the smallest Solid component that proves hydration works. */
export default function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button type="button" class="counter" onClick={() => setCount((c) => c + 1)}>
      Island clicks: {count()}
    </button>
  );
}
