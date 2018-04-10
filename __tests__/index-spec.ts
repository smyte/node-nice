import {
  nice,
  niceSetWorkMs,
  niceMap,
  niceForEach,
  niceCallback,
  niceShouldQueue
} from "../src/index";

let loopCounter;
let loopImmediate;

function bumpLoopCounter() {
  loopCounter++;
  loopImmediate = setImmediate(bumpLoopCounter);
}
beforeEach(() => {
  loopCounter = 0;
  loopImmediate = setImmediate(bumpLoopCounter);
  niceSetWorkMs(10);
});
afterEach(() => {
  clearImmediate(loopImmediate);
});

function range(count) {
  return Array.from(Array(count), (_, idx) => idx);
}
function slow(value?) {
  // @TODO: This could be mocked out, but we'd need to mock process.hrtime too
  const start = Date.now();
  while (Date.now() < start + 15) {
    /* do a backflip */
  }
  return value;
}

test("nice callbacks work", done => {
  expect(loopCounter).toEqual(0);
  niceCallback(() => {
    expect(loopCounter).toEqual(0);
    slow();

    niceCallback(() => {
      expect(loopCounter).toEqual(1);
      done();
    });
  });
});

test("nice promises complete", async () => {
  expect(loopCounter).toEqual(0);
  slow();

  // The first nice call waits for a loop
  expect(await nice(() => 0)).toEqual(0);
  expect(loopCounter).toEqual(1);

  // The following calls should all fit within the first loop
  expect(await nice(() => loopCounter)).toEqual(1);
  expect(await nice(() => loopCounter)).toEqual(1);
  expect(await nice(() => loopCounter)).toEqual(1);
  expect(loopCounter).toEqual(1);

  // Slow action is still in the same loop
  expect(await nice(() => slow(loopCounter))).toEqual(1);
  expect(loopCounter).toEqual(1);

  // Next one falls into another loop though
  expect(await nice(() => loopCounter)).toEqual(2);
  expect(await nice(() => loopCounter)).toEqual(2);

  await expect(
    nice(() => {
      throw Error("oh");
    })
  ).rejects.toThrow("oh");

  // This checks that even a queued error throws
  slow();
  await expect(
    nice(() => {
      throw Error("oh");
    })
  ).rejects.toThrow("oh");
});

test("fast in parallel run in a single loop", async () => {
  // Parallel slow calls all fall into their own loop
  const first = range(5).map(idx => {
    return nice(() => `idx=${idx} loop=${loopCounter}`);
  });
  expect(niceShouldQueue()).toBeFalsy();
  slow();
  expect(niceShouldQueue()).toBeTruthy();
  const second = range(5).map(idx => {
    return nice(() => `idx=${idx} loop=${loopCounter}`);
  });

  expect(await Promise.all(first)).toEqual([
    "idx=0 loop=0",
    "idx=1 loop=0",
    "idx=2 loop=0",
    "idx=3 loop=0",
    "idx=4 loop=0"
  ]);
  expect(await Promise.all(second)).toEqual([
    "idx=0 loop=1",
    "idx=1 loop=1",
    "idx=2 loop=1",
    "idx=3 loop=1",
    "idx=4 loop=1"
  ]);
});

test("launched in parallel run serially", async () => {
  // Parallel slow calls all fall into their own loop
  const results = await Promise.all(
    range(5).map(idx => {
      return nice(() => slow(`idx=${idx} loop=${loopCounter}`));
    })
  );
  expect(results).toEqual([
    "idx=0 loop=0",
    "idx=1 loop=1",
    "idx=2 loop=2",
    "idx=3 loop=3",
    "idx=4 loop=4"
  ]);
});

test("map", async () => {
  // Parallel slow calls all fall into their own loop
  const results = await niceMap(range(5), idx =>
    slow(`idx=${idx} loop=${loopCounter}`)
  );
  expect(results).toEqual([
    "idx=0 loop=0",
    "idx=1 loop=1",
    "idx=2 loop=2",
    "idx=3 loop=3",
    "idx=4 loop=4"
  ]);

  await expect(
    niceMap(range(5), idx => {
      slow();
      if (idx === 3) {
        throw new Error("throw @ 3");
      }
    })
  ).rejects.toThrow("throw @ 3");
});

test("forEach", async () => {
  const results = [];
  await expect(
    niceForEach(range(10), idx => {
      results.push(`idx=${idx} loop=${loopCounter}`);
      if (idx % 2 === 0) {
        slow();
      }
      if (idx === 4) {
        throw new Error("Failure @ 4");
      }
    })
  ).rejects.toThrow("Failure @ 4");

  expect(results).toEqual([
    "idx=0 loop=0",
    "idx=1 loop=1",
    "idx=2 loop=1",
    "idx=3 loop=2",
    "idx=4 loop=2"
  ]);

  let called = false;
  await niceForEach([], idx => {
    called = true;
  });
  expect(called).toEqual(false);
});
