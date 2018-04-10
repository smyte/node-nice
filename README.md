[![Build Status](https://travis-ci.org/smyte/node-nice.svg?branch=master)](https://travis-ci.org/smyte/node-nice.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/smyte/node-nice/badge.svg?branch=master)](https://coveralls.io/github/smyte/node-nice?branch=master)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

# Using this module in other modules

```js
const nice = require("node-nice").nice;

nice(() => {
  return calculatePi();
}).then(result => {
  console.log("π = " + result);
});
```

## Setting travis and coveralls badges

1.  Sign in to [travis](https://travis-ci.org/) and activate the build for your project.
2.  Sign in to [coveralls](https://coveralls.io/) and activate the build for your project.
