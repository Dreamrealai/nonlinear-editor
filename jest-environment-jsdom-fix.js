/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Custom Jest environment that properly handles MessagePort cleanup
 * to prevent "Force exiting Jest" warnings.
 *
 * React's scheduler creates MessagePort objects for scheduling work,
 * but these aren't automatically cleaned up when tests finish.
 * This custom environment tracks and closes them properly.
 */

const JSDOMEnvironment = require('jest-environment-jsdom').default;

class JSDOMEnvironmentWithCleanup extends JSDOMEnvironment {
  constructor(...args) {
    super(...args);

    // Track MessagePorts created during test execution
    this.messagePorts = [];

    // Override MessagePort constructor to track instances
    if (this.global.MessageChannel) {
      const OriginalMessageChannel = this.global.MessageChannel;
      const self = this;

      this.global.MessageChannel = function MessageChannel() {
        const channel = new OriginalMessageChannel();
        // Track both ports
        self.messagePorts.push(channel.port1, channel.port2);
        return channel;
      };
    }
  }

  async teardown() {
    // Close all MessagePorts before tearing down
    for (const port of this.messagePorts) {
      try {
        if (port && typeof port.close === 'function') {
          port.close();
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Clear the array
    this.messagePorts = [];

    // Allow any pending microtasks to complete
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    await super.teardown();
  }
}

module.exports = JSDOMEnvironmentWithCleanup;
