/** @typedef { "no-lock" | "mutex" | "cas" } Strategy */
/** @typedef {{ buf: Int32Array<SharedArrayBuffer>; n: number, strategy: Strategy }} Payload */

/** @type {(buf: Int32Array<SharedArrayBuffer>) => { [Symbol.dispose]: () => void } } */
function acquire(buf) {
  while (Atomics.compareExchange(buf, 1, 0, 1) !== 0) {
    Atomics.wait(buf, 1, 1);
  }

  return {
    [Symbol.dispose]: () => {
      if (Atomics.compareExchange(buf, 1, 1, 0) !== 1) {
        throw new Error("bug");
      }
      Atomics.notify(buf, 1, 1);
    },
  }
}

/** @type {(_: Payload) => Promise<void>} */
async function noLock({ buf, n }) {
  for (let i = 0; i < n; i++) {
    buf[0] += 1;
  }
}

/** @type {(_: Payload) => Promise<void>} */
async function mutex({ buf, n }) {
  using _ = acquire(buf);
  for (let i = 0; i < n; i++) {
    buf[0] += 1;
  }
}

/** @type {(_: Payload) => Promise<void>} */
async function cas({ buf, n }) {
  for (let i = 0; i < n; i++) {
    Atomics.add(buf, 0, 1);
  }
}

/** @type {(event: MessageEvent<Payload>) => Promise<void>} */
async function start(event) {
  try {
    switch (event.data.strategy) {
      case "no-lock":
        await noLock(event.data);
        break;

      case "mutex":
        await mutex(event.data);
        break;

      case "cas":
        await cas(event.data);
        break;

    }

    postMessage("DONE");
  } catch (e) {
    console.error(e);
    postMessage("ERROR");
  }
}

addEventListener("message", (event) => start(event).catch(console.error));
