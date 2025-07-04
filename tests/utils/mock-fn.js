// Mock function utility for Jest ES modules
// Since jest.fn() is not globally available in ES modules, we create our own mock function

export const mockFn = (implementation) => {
  const fn = function(...args) {
    fn.calls.push(args);
    if (fn._mockResolvedValue !== undefined) {
      return Promise.resolve(fn._mockResolvedValue);
    }
    if (fn._mockReturnValue !== undefined) {
      return fn._mockReturnValue;
    }
    return fn._mockImplementation ? fn._mockImplementation(...args) : (implementation ? implementation(...args) : undefined);
  };
  
  fn.calls = [];
  fn._mockResolvedValue = undefined;
  fn._mockReturnValue = undefined;
  fn._mockImplementation = implementation;
  
  fn.mockResolvedValue = (value) => { fn._mockResolvedValue = value; return fn; };
  fn.mockReturnValue = (value) => { fn._mockReturnValue = value; return fn; };
  fn.mockImplementation = (impl) => { fn._mockImplementation = impl; return fn; };
  fn.mockReset = () => {
    fn.calls = [];
    fn._mockResolvedValue = undefined;
    fn._mockReturnValue = undefined;
    fn._mockImplementation = implementation;
  };
  
  return fn;
};
