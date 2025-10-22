const $form = document.querySelector("form");
const $n = document.querySelector("#n");
const $strategy = document.querySelector("#strategy");
const $workers = document.querySelector("#workers");
const $output = document.querySelector("output");

/** @type {(...args: string[]) => void} */
function log(...args) {
  $output?.append(new Text(args.join(" ") + "\n"));
}

/** @type {(buf: Int32Array<SharedArrayBuffer>, n: number, strategy: string) => Promise<void>} */
async function compute(buf, n, strategy) {
  using stack = new DisposableStack();
  const worker = new Worker("./worker.js");
  stack.defer(() => worker.terminate());

  const { resolve, reject, promise } = Promise.withResolvers();
  worker.addEventListener("message", (event) => event.data === "DONE" && resolve(null));
  worker.addEventListener("message", (event) => event.data === "ERROR" && reject(new Error("ERROR")));

  worker.postMessage({ buf, n, strategy });
  await promise;
}

/** @type {() => Promise<void>} */
async function start() {
  if (!window.crossOriginIsolated) {
    log("Reload me, please.");
    return;
  }

  // [value, mutex]
  const buf = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2));

  if (!($n instanceof HTMLInputElement)
      || !($workers instanceof HTMLInputElement)
      || !($strategy instanceof HTMLSelectElement)) {
    throw new Error();
  }

  const n = $n.valueAsNumber;
  const workers = $workers.valueAsNumber;
  const strategy = $strategy.value;

  const begin = performance.now();
  const tasks = [];
  for (let i = 0; i < workers; i++) {
    tasks.push(compute(buf, n, strategy));
  }
  await Promise.all(tasks);
  const end = performance.now();
  const elapsed = end - begin;

  /** @type {(n: number) => string} */
  const fmt = (n) => new Intl.NumberFormat().format(n);
  log(`${strategy}: ${fmt(n)} x ${fmt(workers)} = ${fmt(buf[0])} (${fmt(elapsed | 0)} ms)`);
}

$form?.addEventListener("submit", (event) => {
  event.preventDefault();
  start().catch((e) => log(String(e)));
});
