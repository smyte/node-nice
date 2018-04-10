import Deque = require("double-ended-queue");

type Callback = () => void;

const queue = new Deque<Callback>();

let endWork = 0;
let workTimeMs = 5;

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

export function niceSetWorkMs(ms: number) {
  workTimeMs = ms;
  endWork = Date.now() + workTimeMs;
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

export function niceCallback(cb: () => void): void {
  if (Date.now() < endWork) {
    cb();
  } else {
    niceQueue(cb);
  }
}

export function nice<T>(cb: () => T): Promise<T> {
  if (Date.now() < endWork) {
    try {
      return Promise.resolve(cb());
    } catch (err) {
      return Promise.reject(err);
    }
  } else {
    return new Promise((resolve, reject) => {
      niceQueue(() => {
        try {
          resolve(cb());
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

export function niceForEach<T>(
  arr: T[],
  cb: (value: T) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const length = arr.length;
    let idx = 0;
    const loop = () => {
      try {
        while (idx < length && Date.now() < endWork) {
          cb(arr[idx++]);
        }
      } catch (err) {
        reject(err);
        return;
      }
      if (idx < length) {
        niceQueue(loop);
      } else {
        resolve();
      }
    };
    loop();
  });
}

export function niceMap<T, U>(arr: T[], cb: (value: T) => U): Promise<U[]> {
  return new Promise((resolve, reject) => {
    const rv: U[] = Array(arr.length);
    const length = arr.length;
    let idx = 0;
    const loop = () => {
      try {
        while (idx < length && Date.now() < endWork) {
          rv[idx] = cb(arr[idx++]);
        }
      } catch (err) {
        reject(err);
        return;
      }
      if (idx < length) {
        niceQueue(loop);
      } else {
        resolve(rv);
      }
    };
    loop();
  });
}
