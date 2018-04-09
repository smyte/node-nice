import Deque = require('double-ended-queue');

type Callback = () => void;

const queue = new Deque<Callback>();

let endWork = 0;
let workTimeMs = 1;

function next() {
  let cb: Callback | undefined = queue.shift();

  if (!cb) {
    throw new Error('Unexpected next() event for node-nice');
  }

  // If the queue empties out at any point, calls of nextImmediate from cb()
  // would trigger a loop, so we should not do it
  let skipTrigger = queue.isEmpty();

  endWork = Date.now() + workTimeMs;
  for (;;) {
    cb!();
    if (Date.now() < endWork && !skipTrigger) {
      cb = queue.shift();
      skipTrigger = skipTrigger || queue.isEmpty();
    } else {
      break;
    }
  }
  if (!skipTrigger) {
    setImmediate(next);
  }
}

export function niceSetWorkMs(ms: number) {
  workTimeMs = ms;
}

export function niceQueue(cb: () => void): void {
  if (queue.isEmpty()) {
    setImmediate(next);
  }
  queue.push(cb);
}

export function niceShouldQueue(): boolean {
  return Date.now() >= endWork;
}

export function nicePromise<T>(cb: () => T): Promise<T> {
  if (Date.now() < endWork) {
    return Promise.resolve(cb());
  } else {
    return new Promise(resolve => {
      niceQueue(() => {
        resolve(cb());
      });
    });
  }
}

export function niceCallback(cb: () => void): void {
  if (Date.now() < endWork) {
    cb();
  } else {
    niceQueue(cb);
  }
}
