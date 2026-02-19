// Manual mock for express
function fn(returnValue?: any) {
  const mock: any = (...args: any[]) => {
    mock.calls.push(args);
    if (typeof mock._impl === 'function') return mock._impl(...args);
    return mock._returnValue;
  };
  mock.calls = [] as any[];
  mock._returnValue = returnValue;
  mock._impl = null;
  return mock;
}

const mockRouter = {
  get: fn(null),
  post: fn(null),
  use: fn(null),
};
// Make chainable
mockRouter.get._returnValue = mockRouter;
mockRouter.post._returnValue = mockRouter;
mockRouter.use._returnValue = mockRouter;

const mockApp = {
  use: fn(null),
  get: fn(null),
  post: fn(null),
  listen: fn(null),
};
mockApp.use._returnValue = mockApp;
mockApp.get._returnValue = mockApp;
mockApp.post._returnValue = mockApp;
mockApp.listen._impl = (_port: number, cb?: () => void) => {
  if (cb) cb();
  return { close: fn() };
};

function express() { return mockApp; }

export function Router() { return mockRouter; }
export function json() { return function(_req: any, _res: any, next: any) { next?.(); }; }
export const Request = {} as any;
export const Response = {} as any;

express.Router = Router;
express.json = json;

export default express;
