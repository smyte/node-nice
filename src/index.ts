import Deque = require("double-ended-queue");

type Callback = () => void;

const queue = new Deque<Callback>();

let endWork = 0;
let workTimeMs = 1;

function next() {
  let cb: Callback | undefined = queue.shift();

  if (!cb) {
    throw new Error("Unexpected next() event for node-nice");
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

export function setNiceWorkTime(ms: number) {
  workTimeMs = ms;
}

export function nicePromise<T>(cb: () => T): Promise<T> {
  if (Date.now() < endWork) {
    return Promise.resolve(cb());
  } else {
    return new Promise(resolve => {
      nextNice(() => {
        resolve(cb());
      });
    });
  }
}

export function nextNice(cb: () => void): void {
  if (Date.now() < endWork) {
    cb();
  } else {
    if (queue.isEmpty()) {
      setImmediate(next);
    }
    queue.push(cb);
  }
}
