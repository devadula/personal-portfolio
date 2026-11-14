// Simulates a browser whose IntersectionObserver never calls back.
window.IntersectionObserver = function () {
  return {
    observe() {},
    unobserve() {},
    disconnect() {},
    takeRecords() {
      return [];
    },
  };
};
window.IntersectionObserver.prototype = {};
