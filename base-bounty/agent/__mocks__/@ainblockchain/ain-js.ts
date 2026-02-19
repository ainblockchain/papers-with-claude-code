// Manual mock for @ainblockchain/ain-js
// Uses plain functions that can be spied on by tests

function fn(returnValue?: any) {
  const mock: any = (...args: any[]) => {
    mock.calls.push(args);
    mock.lastCall = args;
    if (mock._impl) return mock._impl(...args);
    return mock._returnValue;
  };
  mock.calls = [] as any[];
  mock.lastCall = null;
  mock._returnValue = returnValue;
  mock._impl = null;
  mock.mockReturnValue = (v: any) => { mock._returnValue = v; return mock; };
  mock.mockResolvedValue = (v: any) => { mock._returnValue = Promise.resolve(v); return mock; };
  mock.mockRejectedValue = (v: any) => { mock._returnValue = Promise.reject(v); return mock; };
  mock.mockResolvedValueOnce = (v: any) => {
    const origImpl = mock._impl;
    mock._impl = (..._args: any[]) => {
      mock._impl = origImpl;
      return Promise.resolve(v);
    };
    return mock;
  };
  mock.mockRejectedValueOnce = (v: any) => {
    const origImpl = mock._impl;
    mock._impl = (..._args: any[]) => {
      mock._impl = origImpl;
      return Promise.reject(v);
    };
    return mock;
  };
  mock.mockImplementation = (impl: any) => { mock._impl = impl; return mock; };
  mock.mockReturnThis = () => { mock._returnValue = mock; return mock; };
  return mock;
}

const createMockInstance = () => ({
  wallet: {
    addAndSetDefaultAccount: fn('0xMockAinAddress'),
  },
  signer: {
    getAddress: fn('0xMockAinAddress'),
  },
  knowledge: {
    setupApp: fn(Promise.resolve({})),
    registerTopic: fn(Promise.resolve({})),
    getTopicInfo: fn(Promise.resolve(null)),
    getFrontierMap: fn(Promise.resolve([])),
    aiExplore: fn(Promise.resolve({ entryId: 'mock_entry_id', txResult: {} })),
    listTopics: fn(Promise.resolve(['ai/transformers'])),
    getExplorers: fn(Promise.resolve([])),
    getExplorations: fn(Promise.resolve(null)),
    aiGenerateCourse: fn(Promise.resolve([])),
    publishCourse: fn(Promise.resolve({ entryId: 'course_entry', txResult: {} })),
  },
  llm: {
    chat: fn(Promise.resolve('Mock LLM response')),
  },
  em: {
    connect: fn(Promise.resolve(undefined)),
    subscribe: fn(),
    disconnect: fn(),
  },
  db: {
    ref: fn({ getValue: fn(Promise.resolve(null)) }),
  },
  eventHandlerUrl: 'ws://localhost:5100',
  sendTransaction: fn(Promise.resolve({})),
});

function MockAin() {
  return createMockInstance();
}

export default MockAin;
