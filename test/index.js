const lib = require('../lib')
const assert = require('chai').assert

describe('testMe', function () {
  const tests = [
    { args: [1, 1], expected: 2 },
    { args: [1, 2], expected: 3 },
    { args: [1, 3], expected: 4 }
  ]

  tests.forEach(function (test) {
    it('correctly adds ' + test.args.length + ' args', function () {
      const actual = lib.testMe(...test.args)
      assert.strictEqual(actual, test.expected)
    })
  })
})
